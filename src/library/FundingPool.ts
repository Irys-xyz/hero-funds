import Arweave from "arweave";
import { Contract, LoggerFactory, WarpNodeFactory } from "warp-contracts";
import NodeCache from "node-cache";
import { APPROVED, ExecutionEngine, queryContracts, selectTokenHolder } from ".";
import { query } from "gql-query-builder";

export default class FundingPool {
	public arweave: Arweave;
	public poolId: string;
	public cache: boolean;
	public execution: ExecutionEngine;
	public nftContract

	// conditional variables
	public contract: Contract;
	public stateCache;
	private stateLockAvailable: boolean;

	/**
	* Constructs a new Funding Pool instance 
	*/

	constructor(
		{ poolId, arweave,
			localCache = false,
			balanceUrl = "http://gateway-1.arweave.net:1984/",
			executionEngine = ExecutionEngine.REDSTONE,
			cacheInvalidation = 100
		}:
			{ localCache: boolean, balanceUrl: string, executionEngine: ExecutionEngine, cacheInvalidation: number, poolId: string, arweave: Arweave }
	) {
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

	static async getApproved(): Promise<string[]> {
		return APPROVED
		// return await axios.get("hoh.bundlr.network/pools/approved")
	}

	async getNFTContract(): Promise<string> {
		const que = await query({
			operation: "transaction",
			variables: {
				id: {
					value: this.poolId,
					type: "ID!"
				}
			},
			fields: [
				"id",
				{ "tags": ["name", "value"] }
			]
		})

		const res = await this.arweave.api.post("/graphql", que);
		return res.data.data.transaction.tags.find(v => v.name === "Contract-Src")?.value
	}


	async getAllContracts(arweave, filterApproved = false): Promise<string[]> {
		if (filterApproved) {
			return await FundingPool.getApproved();
		}
		const contractSrc = await this.getNFTContract()
		const data = await queryContracts(contractSrc, arweave);
		const contracts: string[] = [];
		data.forEach((edge) => contracts.push(edge.node.id));
		return contracts;
	}

	getPoolId(): string {
		return this.poolId;
	}

	allocate(state: any, toAllocate: number, sumContribution: bigint): void {
		const commitFactor = Number(toAllocate) / Number(sumContribution);
		let remainder = toAllocate % Object.keys(state.commit.contributors).length;
		for (const key in state.commit.contributors) {

			let newAllocation = Math.round(commitFactor * Number(state.commit.contributors[key]));
			if (remainder > 0) {
				newAllocation += 1;
				remainder--;
			}
			this.addOrUpdateIntStrings(state.tokens, key, newAllocation);
			this.addOrUpdateBigStrings(state.contributors, key, state.commit.contributors[key]);
		}
		state.totalContributions = (BigInt(state.totalContributions) + BigInt(sumContribution)).toString();
	}

	addOrUpdateBigStrings(object: Record<string, any>, key: string, qty: number | bigint): void {
		if (object[key]) {
			object[key] = (BigInt(object[key]) + BigInt(qty)).toString();
		} else {
			object[key] = qty.toString();
		}
	}

	addOrUpdateIntStrings(object: Record<string, any>, key: string, qty: number): void {
		if (object[key]) {
			object[key] = (parseInt(object[key]) + qty).toString();
		} else {
			object[key] = qty.toString();
		}
	}



	// public functions
	async resolve(state): Promise<void> {
		if (!state.commit) {
			return;
		}
		const currentBlock = await this.arweave.api.get("/block/current");
		const height = currentBlock.data.height;
		if (height > state.commit.n) {
			const totalSupply = parseInt(state.totalSupply);
			// compute new contribution
			let sumContribution = BigInt(0);
			for (const key in state.commit.contributors) {
				sumContribution += BigInt(state.commit.contributors[key]);
			}
			const existingBalance = BigInt(await this.getWalletBalanceAtHeight(state.owner, height)) - sumContribution;
			if (existingBalance == BigInt(0)) {
				// totalSupply==0 => existingBalance==0, but not other way round
				// mint 100% of supply (1 M tokens)
				state.totalSupply = "1000000";
				state.tokens = {};
				const toAllocate = 1000000;
				this.allocate(state, toAllocate, sumContribution);
			} else {

				const mintedTokens = Math.round((Number(BigInt(1000000000000) * sumContribution / existingBalance) / 1000000000000) * Number(totalSupply));
				const adjustmentFactor = Number(totalSupply) / Number(totalSupply + mintedTokens);
				let sum = 0;
				for (const key in state.tokens) {
					const newAlloc = Math.round(state.tokens[key] * adjustmentFactor);
					sum += newAlloc;
					state.tokens[key] = newAlloc.toString();
				}
				const toAllocate = totalSupply - sum;
				this.allocate(state, toAllocate, sumContribution);
			}
			delete state.commit;
		}
	}

	async getWalletBalanceAtHeight(address: string, height: number): Promise<number> {
		const balance = await this.arweave.api.get(`/block/height/${height}/wallet/${address}/balance`)
		return +balance?.data;
	}

	// read current state, with caching
	async getState(): Promise<any> {
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

	async getInitState(): Promise<any> {
		const initState = this.stateCache.get("init");
		if (initState == undefined) {
			const stateResponse = await this.arweave.api.get(`/${this.poolId}`);
			const state = stateResponse.data;
			this.stateCache.set("init", state, 10000);
			return state;
		} else {
			return initState;
		}
	}

	async getRandomContributor(): Promise<string> {
		const state = await this.getState();
		return selectTokenHolder(state.tokens, state.totalSupply);
	}

	async contribute(amount: string): Promise<string> {
		if (!Number(amount)) {
			throw new Error("Please contribute a valid (winston) amount");
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

	async commit(): Promise<string> {
		const contractInteractor = this.contract.connect("use_wallet");
		const interactionTx = await contractInteractor.writeInteraction({
			function: "commit"
		});
		return interactionTx;
	}

	async getOwnerBalance(): Promise<string> {
		const [state, currentBlock] = await Promise.all([this.getInitState(), this.arweave.api.get("/block/current")]);
		const ownerAddress = state.owner;
		const walletListHash = currentBlock.data.wallet_list;
		const balance = await this.arweave.api.get(`/wallet_list/${walletListHash}/${ownerAddress}/balance`);
		return balance.data;
	}

	async getMetadata(): Promise<any> {
		const initState = await this.getInitState();
		const metadata = ({ title, description, link, owner }) => { return { title, description, link, owner } };
		return metadata(initState);
	}

	async getNftTags(projectName: string, artefactId: string, transferable = false, lockTime = 0): Promise<any> {
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
			"balances": {},
			"owners": {},
			"maxSupply": 1,
			"contentType": "application/json",
			"transferable": transferable,
			"lockTime": lockTime,
			"lastTransferTimestamp": null
		}

		initialState.balances[tokenHolder] = 1;
		initialState.owners["1"] = tokenHolder;
		tags.push({ name: "App-Name", value: "SmartWeaveContract" });
		tags.push({ name: "App-Version", value: "0.3.0" });
		tags.push({ name: "Action", value: "marketplace/Create" });
		tags.push({ name: "Network", value: "Koi" });
		tags.push({ name: "Contract-Src", value: this.nftContract });
		tags.push({ name: "Init-State", value: JSON.stringify(initialState) });
		tags.push({ name: "Initial-Owner", value: tokenHolder })
		return tags;
	}

}
