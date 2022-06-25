import { SourceImpl } from "warp-contracts"
import Arweave from "arweave"
import { readFileSync } from "fs"

async function main(): Promise<void> {
	const arweave = Arweave.init({
		host: "arweave.net",
		port: 443,
		protocol: "https",
	});
	console.log("Deploying Pool contract source")
	const src = new SourceImpl(arweave)
	const wallet = JSON.parse(readFileSync("./wallets/wallet.json").toString())
	const poolSrc = readFileSync("./build/contracts/pool/contract.js", "utf8");
	console.log(`Deployment: ${(await src.save({ src: poolSrc }, wallet)).id}`)
}
main()