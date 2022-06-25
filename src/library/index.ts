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

export async function createPool(
    { arweave, wallet, poolContractSrc,
        owner,
        title,
        description,
        link = "",
        ownerInfo = "",
        rewards = ""
    }:
        { arweave: Arweave, title: string, description: string, wallet: JWKInterface, owner: string, poolContractSrc: string, link: string, ownerInfo: string, rewards: string }
): Promise<string> {
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
        }, {
            "name": "Pool-Name",
            "value": title
        }
    ];

    const warp = WarpNodeFactory.memCached(arweave);
    // Deploying contract

    const contractTxId = await warp.createContract.deployFromSourceTx(
        {
            wallet,
            initState,
            srcTxId: poolContractSrc,
            tags: customTags
        });
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
