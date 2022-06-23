// import Arfund from ".";
// import Arweave from "arweave";

// const poolId = process.argv[2];
// const arweave = Arweave.init({
//     host: "arweave.net",
//     port: 443,
//     protocol: "https",
//     timeout: 20000,
//     logging: false,
// });

// const fund = new Arfund(poolId, arweave, true);


// const test = async () => {
//     let state;
//     for (let i = 0; i < 5; i++) {
//         state = await fund.getState();
//         console.log(`fetched state ${i + 1} times`);
//     }
//     console.log(JSON.stringify(state, null, 2));
//     for (let i = 0; i < 5; i++) {
//         const contributor = await fund.getRandomContributor();
//         console.log(contributor);
//     }
//     const contracts = await fund.getAllContracts(arweave, true);
//     console.log(contracts);
//     const balance = await fund.getOwnerBalance();
//     console.log(`balance = ${balance}`);
//     const initState = await fund.getInitState();
//     console.log(initState);
//     const metadata = await fund.getMetadata();
//     console.log(metadata);
//     const tags = await fund.getNftTags("Client Test", "001", true);
//     console.log(tags);
//     // const wallet = JSON.parse(fs.readFileSync(path.join(__dirname, "../../wallet.json"), "utf8"));
//     // const newPool = await createPool(arweave, "Arfunds test client", "Testing contract, please do not send funds", wallet, "BGPtWI8nw9N64w3z3d37_2ZHId6i0Y_aGLLpcvdBg0I");
//     // console.log(newPool);
// }

// test();

import Arweave from "arweave";
import { query } from "gql-query-builder";

(async function () {

    const arweave = Arweave.init({
        host: "arweave.net",
        port: 443,
        protocol: "https",
        timeout: 20000,
        logging: false,
    });

    const que = await query({
        operation: "transaction",
        variables: {
            id: {
                value: "_XBR5_WFzWdI_7a2lDa9nSA_C2qahNhjBMDJfRDAweM",
                type: "ID!"
            }
        },
        fields: [
            "id",
            { "tags": ["name", "value"] }
        ]
    })

    const res = await arweave.api.post("/graphql", que);
    const a = res.data.data.transaction.tags.find(v => v.name === "Contract-Src")?.value
    console.log(a)
})()