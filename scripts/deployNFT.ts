

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