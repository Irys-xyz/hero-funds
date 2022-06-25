
import Arweave from "arweave";
import { readFileSync } from "fs";
import { createPool, FundingPool, getAllArtefactsByOwner, getAllArtefactsByPool } from "../src/library"
(async function () {
    const arweave = Arweave.init({
        host: "localhost",
        port: 1984,
        protocol: "http",
    });
    // const wallet = JSON.parse(readFileSync("./wallets/iPaEcY-et2fYY3ulqjFfnDXhRcf8wDkiGg9nX4c8xag.json").toString())
    // await arweave.api.get(`/mint/${"iPaEcY-et2fYY3ulqjFfnDXhRcf8wDkiGg9nX4c8xag"}/2000000000000`);
    // const poolTx = await createPool({
    //     arweave,
    //     title: "test pool",
    //     description: "test",
    //     wallet,
    //     owner: "iPaEcY-et2fYY3ulqjFfnDXhRcf8wDkiGg9nX4c8xag",
    //     poolContractSrc: "2uvbtiKk6fiseI5Do6AWBOvx2fTEF4twbRfhE5xhdXo",
    //     link: "",
    //     ownerInfo: "test",
    //     rewards: "nothing"
    // })
    // console.log(poolTx)
    // const pool = new FundingPool({ arweave, nftContractSrc: "2uvbtiKk6fiseI5Do6AWBOvx2fTEF4twbRfhE5xhdXo", poolId: poolTx })
    // console.log(pool)
    await getAllArtefactsByOwner(arweave, "psBiSxdGBUztlVEIGoalKv2r3ZrbUunr2ZI2-L7s1uA")
    //await getAllArtefactsByPool(arweave, poolTx)
})()