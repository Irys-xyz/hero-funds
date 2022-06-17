import Arweave from "arweave";
import { LoggerFactory, WarpNodeFactory } from "warp-contracts";
import NodeCache from "node-cache";
import { selectTokenHolder } from "./selectRandomHolder";
import { queryContracts } from "./queryContracts";
import initstate from "../contracts/init.json"

const CONTRACT_SRC = "iZJZIiz1jxpD_PWI6It5HxxC-bO2JKNSW7jWzbCxcYE";

enum ExecutionEngine {
	REDSTONE,
	NONE
}

export async function getAllContracts(arweave, filterApproved = false) {
	const APPROVED = ["5Hoz9v0VgecpgHSeljNnZSWNEYff9JmZCIVyQmNpqEQ"];
	if (filterApproved) {
		return APPROVED;
	}
	const data = await queryContracts(CONTRACT_SRC, arweave);
	const contracts: string[] = [];
	data.forEach((edge) => contracts.push(edge.node.id));
	return contracts;
}

export async function createPool(arweave, title, description, wallet, owner, link = "", ownerInfo = "", rewards = "Transferable artefacts") {
	const currentBlock = await arweave.api.get('/block/current');
	const balance = await arweave.api.get(`/wallet_list/${currentBlock.data.wallet_list}/${owner}/balance`);
	if (!(balance.data == "0")) {
		throw new Error(`Archiving pool address (owner) must have 0 balance at the time of creation. Balance of provided address ${owner} is ${balance.data}`);
	}
	const initJson = initstate
	initJson.title = title;
	initJson.useOfProceeds = description;
	initJson.owner = owner;
	initJson.link = link;
	initJson.ownerInfo = ownerInfo;
	initJson.rewards = rewards;
	let initState = JSON.stringify(initJson, null, 2);

	const customTags = [
		{
			"name": "App-Type",
			"value": "Archiving-Pool-v1.0"
		}
	];

	const smartweave = WarpNodeFactory.memCached(arweave);
	// Deploying contract
	console.log("Deployment started");
	const contractTxId = await smartweave.createContract.deployFromSourceTx(
		{
			wallet,
			initState,
			srcTxId: CONTRACT_SRC,
			tags: customTags
		});
	console.log(`Deployed pool ${contractTxId} with source tx ${CONTRACT_SRC}`);
	return contractTxId;
}

export default class Arfund {
	public arweave: Arweave;
	public poolId: string;
	public cache: boolean;
	public execution: ExecutionEngine;

	// conditional variables
	public contract;
	public stateCache;
	private stateLockAvailable;

	/**
	* Constructs a new Arfund instance 
	* @param poolId - ID of the pool's init state to connect to
	*/

	constructor(poolId: string, arweave: Arweave, localCache = false, balanceUrl = "http://gateway-1.arweave.net:1984/", executionEngine = ExecutionEngine.REDSTONE, cacheInvalidation = 100) {
		this.poolId = poolId;
		this.cache = localCache;
		this.execution = executionEngine;
		this.arweave = arweave;
		this.stateLockAvailable = true;

		if (this.execution == ExecutionEngine.REDSTONE) {
			LoggerFactory.INST.logLevel("fatal");
			const smartweave = WarpNodeFactory.memCachedBased(arweave).useArweaveGateway().build();
			this.contract = smartweave.contract(this.poolId).setEvaluationOptions({
				walletBalanceUrl: balanceUrl
			});
		}
		this.stateCache = new NodeCache({ stdTTL: cacheInvalidation });

	}


	getPoolId() {
		return this.poolId;
	}

	allocate(state, toAllocate, sumContribution) {
		const commitFactor = Number(toAllocate) / Number(sumContribution);
		let remainder = toAllocate % Object.keys(state.commit.contributors).length;
		for (let key in state.commit.contributors) {
			// @ts-ignore
			let newAllocation = parseInt(commitFactor * Number(state.commit.contributors[key]));
			if (remainder > 0) {
				newAllocation += 1;
				remainder--;
			}
			this.addOrUpdateIntStrings(state.tokens, key, newAllocation);
			this.addOrUpdateBigStrings(state.contributors, key, state.commit.contributors[key]);
		}
		state.totalContributions = (BigInt(state.totalContributions) + sumContribution).toString();
	}

	addOrUpdateBigStrings(object, key, qty) {
		if (object[key]) {
			object[key] = (BigInt(object[key]) + BigInt(qty)).toString();
		} else {
			object[key] = qty.toString();
		}
	}

	addOrUpdateIntStrings(object, key, qty) {
		if (object[key]) {
			object[key] = (parseInt(object[key]) + qty).toString();
		} else {
			object[key] = qty.toString();
		}
	}



	// public functions
	async resolve(state) {
		if (!state.commit) {
			return;
		}
		const currentBlock = await this.arweave.api.get('/block/current');
		const height = currentBlock.data.height;
		if (height > state.commit.n) {
			const totalSupply = parseInt(state.totalSupply);
			// compute new contribution
			let sumContribution = BigInt(0);
			for (let key in state.commit.contributors) {
				sumContribution += BigInt(state.commit.contributors[key]);
			}
			const existingBalance = BigInt(await this.getWalletBalanceAtHeight(state.owner, height, this.arweave)) - sumContribution;
			if (existingBalance == BigInt(0)) {
				// totalSupply==0 => existingBalance==0, but not other way round
				// mint 100% of supply (1 M tokens)
				state.totalSupply = "1000000";
				state.tokens = {};
				const toAllocate = 1000000;
				this.allocate(state, toAllocate, sumContribution);
			} else {
				// @ts-ignore
				const mintedTokens = parseInt((Number(BigInt(1000000000000) * sumContribution / existingBalance) / 1000000000000) * Number(totalSupply));
				const adjustmentFactor = Number(totalSupply) / Number(totalSupply + mintedTokens);
				let sum = 0;
				for (let key in state.tokens) {
					// @ts-ignore
					const newAlloc = parseInt(state.tokens[key] * adjustmentFactor);
					sum += newAlloc;
					state.tokens[key] = newAlloc.toString();
				};
				const toAllocate = totalSupply - sum;
				this.allocate(state, toAllocate, sumContribution);
			}
			delete state.commit;
		}
	}

	async getWalletBalanceAtHeight(address, height, arweave) {
		const balance = await arweave.api.get(`/block/height/${height}/wallet/${address}/balance`)
		return balance.data;
	}

	// read current state, with caching
	async getState() {
		if (!this.cache) {
			const { state } = await this.contract.readState();
			return state;
		}

		// if in cache, use that value
		let currentState = this.stateCache.get("current");
		if (currentState == undefined) {
			// critical section - use locks
			while (!this.stateLockAvailable) {
				await new Promise(resolve => setTimeout(resolve, 200));

			}
			currentState = this.stateCache.get("current");
			if (currentState) {
				return currentState;
			} else {
				try {
					this.stateLockAvailable = false;
					const { state } = await this.contract.readState();
					await this.resolve(state);
					this.stateCache.set("current", state);
					this.stateLockAvailable = true;
					return state;
				} finally {
					this.stateLockAvailable = true;
				}
			}
		} else {
			return currentState;
		}
	}

	async getInitState() {
		let initState = this.stateCache.get("init");
		if (initState == undefined) {
			const stateResponse = await this.arweave.api.get(`/${this.poolId}`);
			const state = stateResponse.data;
			this.stateCache.set("init", state, 10000);
			return state;
		} else {
			return initState;
		}
	}

	async getRandomContributor() {
		const state = await this.getState();
		return selectTokenHolder(state.tokens, state.totalSupply);
	}

	async contribute(amount: string) {
		if (!Number(amount)) {
			throw new Error(`Please contribute a valid (winston) amount`);
		}
		const contractInteractor = this.contract.connect("use_wallet");
		const initState = await this.getInitState();
		const interactionTx = await contractInteractor.writeInteraction({
			function: "contribute"
		}, [], {
			target: `${initState.owner}`,
			// .000001 AR
			winstonQty: amount
		});
		return interactionTx;
	}

	async commit() {
		const contractInteractor = this.contract.connect("use_wallet");
		const interactionTx = await contractInteractor.writeInteraction({
			function: "commit"
		});
		return interactionTx;
	}

	async getOwnerBalance(): Promise<string> {
		const [state, currentBlock] = await Promise.all([this.getInitState(), this.arweave.api.get(`/block/current`)]);
		const ownerAddress = state.owner;
		const walletListHash = currentBlock.data.wallet_list;
		const balance = await this.arweave.api.get(`/wallet_list/${walletListHash}/${ownerAddress}/balance`);
		return balance.data;
	}

	async getMetadata(): Promise<any> {
		const initState = await this.getInitState();
		const metadata = ({ title, useOfProceeds, link, owner }) => { return { title, useOfProceeds, link, owner } };
		return metadata(initState);
	}

	async getNftTags(projectName: string, artefactId: string, transferable: boolean): Promise<any> {
		/**
			  * Koi NFT params
			  * App-Name: SmartWeaveContract
			  * App-Version: 0.3.0
			  * Action: marketplace/Create
			  * Network: Koi
			  * Contract-Src: tWSBznzm4ccTlgxRBUmbU-5nqMXtH9W4WhNHVeZS0q0
			  * Init-State: { init state json }
			  */
		const tags = [];
		const tokenHolder = await this.getRandomContributor();
		const initialState = {
			"title": `${projectName} Artefact`,
			"name": `Artefact ${artefactId}`,
			"description": `Minted from archiving pool ${this.getPoolId()}`,
			"ticker": "KOINFT",
			"balances": {
			},
			"owners": {
			},
			"maxSupply": 1,
			"contentType": "application/json",
			"transferable": transferable
		}

		initialState.balances[tokenHolder] = 1;
		initialState.owners["1"] = tokenHolder;
		tags.push({ name: "App-Name", value: "SmartWeaveContract" });
		tags.push({ name: "App-Version", value: "0.3.0" });
		tags.push({ name: "Action", value: "marketplace/Create" });
		tags.push({ name: "Network", value: "Koi" });
		tags.push({ name: "Contract-Src", value: "tWSBznzm4ccTlgxRBUmbU-5nqMXtH9W4WhNHVeZS0q0" });
		tags.push({ name: "Init-State", value: JSON.stringify(initialState) });
		return tags;
	}

}
