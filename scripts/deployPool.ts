// import { createPool } from "../library";
// import { readFileSync } from "fs"
// import { resolve } from "path"

// import Arweave from "arweave"

// const corp_scripts = JSON.parse(readFileSync("wallet.json").toString());


// (async () => {

// 	const arweave = Arweave.init({
// 		host: "arweave.net",
// 		port: 443,
// 		protocol: "https",
// 	});

// 	const config = JSON.parse(readFileSync("config.json").toString());
// 	const contractSrc = readFileSync(resolve("../contracts/contract.js"), "utf8");

// 	// await createPool(arweave, config.Pool.Title, config.Pool.Description, corp_scripts, config.Pool.Wallet, config.Pool.Website, config.Pool.OperatorInfo, config.Pool.Rewards);

// 	// Deploying contract
// 	/*
// * console.log("Deployment started");
// 	* const contractTxId = await smartweave.createContract.deploy({
// 	*	wallet: corp_scripts,
// 	*	initState: initState,
// 	*	src: contractSrc,
// *	tags: customTags
// 	* });
// */



// })();

import { DefaultCreateContract } from "warp-contracts"
import Arweave from "arweave"
import { readFileSync } from "fs"
async function main(): Promise<void> {
	const arweave = Arweave.init({
		host: "arweave.net",
		port: 443,
		protocol: "https",
	});
	const deployer = new DefaultCreateContract(arweave)
	const JWK = JSON.parse(readFileSync("").toString())
	const initState = JSON.parse(readFileSync("../src/contracts/init.json").toString())
	const src = readFileSync("../src/contracts/contract.js")
	const deployRes = deployer.deploy({ src, wallet: JWK, initState })
	console.log(deployRes)
}
main()