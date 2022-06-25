import Arweave from "arweave";
import { Contract, LoggerFactory, WarpNodeFactory } from "warp-contracts";
import NodeCache from "node-cache";
import { ExecutionEngine, queryContracts, selectTokenHolder } from ".";
import { query } from "gql-query-builder";

export default class FundingPool {

	public arweave: Arweave;
	public poolId: string;
	public cache: boolean;
	public execution: ExecutionEngine;
	public nftContractSrc: string

	// conditional variables
	public contract: Contract;
	public stateCache: NodeCache;
	public artefactSeries: string

	/**
	* Constructs a new Funding Pool instance 
	*/

	constructor(
		{ poolId, arweave, nftContractSrc,
			artefactSeries = "Heroes-Of-History",
			localCache = false,
			balanceUrl = "http://gateway-1.arweave.net:1984/",
			executionEngine = ExecutionEngine.REDSTONE,
			cacheInvalidation = 100
		}:
			{ localCache?: boolean, balanceUrl?: string, executionEngine?: ExecutionEngine, cacheInvalidation?: number, poolId: string, arweave: Arweave, nftContractSrc: string, artefactSeries?: string }
	) {
		this.poolId = poolId;
		this.cache = localCache;
		this.execution = executionEngine;
		this.arweave = arweave;
		this.nftContractSrc = nftContractSrc
		this.artefactSeries = artefactSeries

		if (this.execution == ExecutionEngine.REDSTONE) {
			LoggerFactory.INST.logLevel("fatal");
			const smartweave = WarpNodeFactory.memCachedBased(arweave).useArweaveGateway().build();
			this.contract = smartweave.contract(this.poolId).setEvaluationOptions({
				walletBalanceUrl: balanceUrl
			});
		}
		this.stateCache = new NodeCache({ stdTTL: cacheInvalidation });

	}

	async getContractSrc(): Promise<string> {
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


	async getAllPools(filterApproved = false): Promise<string[]> {
		if (filterApproved) {
			// return await axios.get("hoh.bundlr.network/pools/approved")
			return ["5Hoz9v0VgecpgHSeljNnZSWNEYff9JmZCIVyQmNpqEQ"]
		}
		const contractSrc = await this.getContractSrc()
		const data = await queryContracts(contractSrc, this.arweave);
		const contracts: string[] = [];
		data.forEach((edge) => contracts.push(edge.node.id));
		return contracts;
	}

	getPoolId(): string {
		return this.poolId;
	}


	// read current state, with caching
	async getState(): Promise<any> {
		if (!this.cache) {
			const { state } = await this.contract.readState();
			return state;
		}
		// if in cache, use that value
		const currentState = this.stateCache.get("current");
		if (currentState == undefined) {
			const { state } = await this.contract.readState();
			this.stateCache.set("current", state);
			return state;
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
		this.stateCache.del("current")
		return interactionTx;
	}


	async getNftData(artefactId: string, transferable = null, lockTime = 0): Promise<any> {
		const tags = [];
		const tokenHolder = await this.getRandomContributor();
		const projectName = (await this.getInitState()).title
		const initialState = {
			"title": `${projectName} Artefact`,
			"name": `Artefact #${artefactId}`,
			"description": `Minted from archiving pool ${this.getPoolId()}`,
			"ticker": "KOINFT",
			"balances": {},
			// "owner": tokenHolder,
			"maxSupply": 100, //used to allow fractional shares without stepping into decimal territory
			"contentType": "application/json",
			"transferable": transferable,
			"lockTime": lockTime,
			"lastTransferTimestamp": null,
			"createdAt": new Date().getTime()
		}

		initialState.balances[tokenHolder] = initialState.maxSupply;
		tags.push({ name: "Action", value: "marketplace/Create" });
		tags.push({ name: "Network", value: "Koi" });
		tags.push({ name: "Artefact-Series", value: this.artefactSeries })
		tags.push({ name: "Pool-Id", value: this.getPoolId() })
		tags.push({ name: "Initial-Owner", value: tokenHolder })
		return { tags, initialState };
	}

}
