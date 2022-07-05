import Arweave from "arweave";
import { readFileSync } from "fs";
import { createPool } from "../src/library";

(async function () {
    const arweave = Arweave.init({
        host: "arweave.net",
        port: 443,
        protocol: "https",
    });
    console.log("Creating new pool...")
    const wallet = JSON.parse(readFileSync("./wallets/wallet.json").toString())
    const pool = await createPool({
        arweave, wallet,
        poolContractSrc: "Ral3uvTqc5T-GJnBKMEij2fWzXtt6HF-zrIPx8OCqTg",
        owner: await arweave.wallets.getAddress(wallet),
        title: "test pool",
        description: "this is a test pool - please do not contribute!",
        link: "",
        ownerInfo: "",
        rewards: "nothing"
    })
    console.log(pool)

})()