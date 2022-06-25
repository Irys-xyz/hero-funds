import { SourceImpl } from "warp-contracts"
import Arweave from "arweave"
import { readFileSync } from "fs"

async function main(): Promise<void> {
	const arweave = Arweave.init({
		host: "arweave.net",
		port: 443,
		protocol: "https",
	});
	console.log("Deploying NFT contract source")
	const src = new SourceImpl(arweave)
	const wallet = JSON.parse(readFileSync("./wallets/wallet.json").toString())
	const NFTSrc = readFileSync("./build/contracts/NFT/contract.js", "utf8");
	console.log(`Deployment: ${(await src.save({ src: NFTSrc }, wallet)).id}`)
}
main()