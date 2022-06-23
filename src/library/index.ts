import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import { query } from "gql-query-builder";
import { WarpNodeFactory } from "warp-contracts";
export { default as FundingPool } from "./FundingPool"
import initstate from "../contracts/pool/init.json"

export enum ExecutionEngine {
    REDSTONE,
    NONE
}

export const APPROVED = [
    "5Hoz9v0VgecpgHSeljNnZSWNEYff9JmZCIVyQmNpqEQ"
];

export async function createPool(
    { arweave, title, description, wallet, owner, poolContract,
        link = "",
        ownerInfo = "",
        rewards = "Transferable artefacts"
    }:
        { arweave: Arweave, title: string, description: string, wallet: JWKInterface, owner: string, poolContract: string, link: string, ownerInfo: string, rewards: string }
): Promise<string> {
    const currentBlock = await arweave.api.get("/block/current");
    const balance = await arweave.api.get(`/wallet_list/${currentBlock.data.wallet_list}/${owner}/balance`);
    if (!(balance.data == "0")) {
        throw new Error(`Archiving pool address (owner) must have 0 balance at the time of creation. Balance of provided address ${owner} is ${balance.data}`);
    }
    const initJson = initstate
    initJson.title = title;
    initJson.description = description;
    initJson.owner = owner;
    initJson.link = link;
    initJson.ownerInfo = ownerInfo;
    initJson.rewards = rewards;
    const initState = JSON.stringify(initJson, null, 2);

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
            srcTxId: poolContract,
            tags: customTags
        });
    console.log(`Deployed pool ${contractTxId} with source tx ${poolContract}`);
    return contractTxId;
}

export async function queryContracts(source, arweave): Promise<any[]> {
    const que = query({
        operation: "transactions",
        variables: {
            tags: {
                value: {
                    name: "Contract-Src",
                    values: [source]
                },
                type: "[TagFilter!]"
            }
        },
        fields: [
            {
                edges: [
                    {
                        node: [
                            "id"
                        ]
                    }
                ]
            }
        ]

    })
    const res = await arweave.api.post("/graphql", que);
    return res.data.data.transactions.edges;
}

export function selectTokenHolder(tokens, totalSupply) {
    const weights = {};
    for (const address of Object.keys(tokens)) {
        weights[address] = tokens[address] / totalSupply;
    }

    let sum = 0;
    const r = Math.random();

    for (const address of Object.keys(weights)) {
        sum += weights[address];
        if (r <= sum && weights[address] > 0) {
            return address;
        }
    }

    throw new Error("Unable to select token holder");
}
