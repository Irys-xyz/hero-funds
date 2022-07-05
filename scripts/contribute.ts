import Arweave from "arweave"
import { readFile, readFileSync } from "fs";
import { WarpNodeFactory } from "warp-contracts"

(async function () {
    const arweave = Arweave.init({
        host: "arweave.net",
        port: 443,
        protocol: "https",
        timeout: 20000,
        logging: false,
    });

    const warp = WarpNodeFactory.memCached(arweave)

    const key = JSON.parse(readFileSync("./wallets/mjeA48yGmfJ9HrWpPx8MN_Rkux90526BQ3DA_oSxrbc.json").toString())
    const poolId = "0v4qUzj-3SaHLKq_uGt8dT5yan2wO2ylkOwXLf3mLaE"

    const conInteractor = warp.contract(poolId).connect(key)
    const initState = (await arweave.api.get(`/${poolId}`)).data

    console.log(`Contributing to ${initState.owner} from ${await arweave.wallets.getAddress(key)}`)

    // await conInteractor.writeInteraction({
    //     function: "contribute"
    // }, [], {
    //     target: initState.owner,
    //     winstonQty: `1000000`
    // });


    console.log(await conInteractor.readState())
    console.log("done!")

})()