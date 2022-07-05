
import Arweave from "arweave";
import { readFileSync } from "fs";
import { LoggerFactory, WarpNodeFactory } from "warp-contracts";
(async function () {



    const wallet = JSON.parse(readFileSync("./wallets/wallet.json").toString())

    const initState = {
        "title": "TwittAR Artefact",
        "name": "Artefact 000000",
        "description": "Minted from archiving pool HoH...",
        "ticker": "KOINFT",
        "balances": {},
        "maxSupply": 1,
        "contentType": "application/json",
        "transferable": false,
        "lockTime": 0,
        "lastTransferTimestamp": null
    }


    // // Arweave and SmartWeave initialization
    LoggerFactory.INST.logLevel('debug');
    const arweave = Arweave.init({
        host: 'arweave.net',
        port: 443,
        protocol: 'https',
    });
    const smartweave = WarpNodeFactory.memCached(arweave);

    // Deploying contract
    // console.log('Deployment started');
    // const tags: any[] = []


    // tags.push({ name: "Action", value: "marketplace/Create" });
    // tags.push({ name: "Network", value: "Koi" });
    // tags.push({ name: "Artefact-Series", value: "TEST" })
    // tags.push({ name: "Pool-Id", value: "TEST" })
    // tags.push({ name: "Initial-Owner", value: "TEST" })

    const tags = [
        {
            name: "Application",
            value: "TwittAR",
        },
        {
            name: "Tweet-ID",
            value: "1541104106009403392",
        },
        {
            name: "Author-ID",
            value: "18653221",
        },
        {
            name: "Author-Name",
            value: "Commentary Magazine",
        },
        {
            name: "Author-Handle",
            value: "@Commentary",
        },
        {
            name: "Key-Word-List",
            value: "ukraine-russia-war",
        },
        {
            name: "Key-Word-List-Version",
            value: "1",
        },
        {
            name: "Type",
            value: "manifest",
        },
        {
            name: "Action",
            value: "marketplace/Create",
        },
        {
            name: "Network",
            value: "Koi",
        },
        {
            name: "Artefact-Series",
            value: "Heroes-Of-History",
        },
        {
            name: "Pool-Id",
            value: "0v4qUzj-3SaHLKq_uGt8dT5yan2wO2ylkOwXLf3mLaE",
        },
        {
            name: "Initial-Owner",
            value: "mjeA48yGmfJ9HrWpPx8MN_Rkux90526BQ3DA_oSxrbc",
        },
    ]

    const manifest = {
        manifest: "arweave/paths",
        version: "0.1.0",
        index: {
            path: "tweet.json",
        },
        paths: {
            "tweet.json": {
                id: "E48bgosypmK3gaqNFV0KJh5-UeQu9-UzVmqJrslUwXA",
            },
        },
    }

    const contractTxId = await smartweave.createContract.deployFromSourceTx(
        {
            wallet: wallet,
            initState: JSON.stringify(initState),
            srcTxId: 'Qa7IR-xvPkBtcYUBZXd8z-Tu611VeJH33uEA5XiFUNA',
            data: { "Content-Type": "application/x.arweave-manifest+json", body: JSON.stringify(manifest) },
            tags: tags
        },
        true
    );
    console.log('Deployment completed: ' + contractTxId);


    //
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
    // const pool = new FundingPool({ arweave, nftContractSrc: "2uvbtiKk6fiseI5Do6AWBOvx2fTEF4twbRfhE5xhdXo", poolId: "poolTx" })
    // console.log(pool)
    // await getAllArtefactsByOwner(arweave, "psBiSxdGBUztlVEIGoalKv2r3ZrbUunr2ZI2-L7s1uA")
    //await getAllArtefactsByPool(arweave, poolTx)
})()