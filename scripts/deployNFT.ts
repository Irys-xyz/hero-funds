import { SourceImpl, WarpNodeFactory } from "warp-contracts"
import Arweave from "arweave"
import { readFileSync } from "fs"

async function main(): Promise<void> {
	const arweave = Arweave.init({
		host: "arweave.net",
		port: 443,
		protocol: "https",
	});
	console.log("Deploying NFT contract source")
	//const src = new SourceImpl(arweave)
	const warp = WarpNodeFactory.memCached(arweave)
	const wallet = JSON.parse(readFileSync("./wallets/wallet.json").toString())
	const NFTSrc = readFileSync("./build/contracts/NFT/contract.js", "utf8");
	const NFTInitState = JSON.parse(readFileSync("./build/contracts/NFT/init.json", "utf8"));
	NFTInitState.maxSupply = 0
	NFTInitState.transferable = false
	NFTInitState.name = "DEPLOY"
	NFTInitState.title = "DEPLOY"
	NFTInitState.description = "SRC DEPLOYMENT CONTRACT"

	const deployment = await warp.createContract.deploy({
		src: NFTSrc,
		initState: JSON.stringify(NFTInitState),
		wallet
	}, true)
	console.log(deployment)
	//console.log(`Deployment: ${(await src.save({ src: NFTSrc }, wallet)).id}`)
}
main()