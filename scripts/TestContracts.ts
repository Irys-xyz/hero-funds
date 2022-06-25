import Arweave from "arweave";
import { readFileSync } from "fs"
import { join } from "path"
import { WarpNodeFactory, LoggerFactory, sleep, DefaultCreateContract, SourceImpl } from "warp-contracts"
import Arlocal from "arlocal"
import { FundingPool } from "../src/library"

import Axios from "axios"

async function generateFundedWallet(arweave) {
	const wallet = await arweave.wallets.generate();
	const walletAddress = await arweave.wallets.jwkToAddress(wallet);
	await arweave.api.get(`/mint/${walletAddress}/2000000000000`);
	return wallet;
}

async function generateEmptyWallet(arweave) {
	return await arweave.wallets.generate();
}



async function runTests() {

	// Set up Arweave client


	// if (test) {
	// Set up ArLocal
	// const arLocal = new Arlocal(1984, false);
	// await arLocal.start();

	// arweave = Arweave.init({
	// 	host: "testnet.redstone.tools",
	// 	port: 443,
	// 	protocol: "https"
	// });

	const arweave = Arweave.init({
		host: "localhost",
		port: 1984,
		protocol: "http"
	});

	const wallet = await arweave.wallets.generate();
	const mine = () => arweave.api.get("mine");
	// const stop = () => arLocal.stop()

	// add funds to wallet
	const walletAddress = await arweave.wallets.jwkToAddress(wallet);
	await arweave.api.get(`/mint/${walletAddress}/3000000000000`);
	arweave.wallets.getBalance(walletAddress).then(
		(balance) => console.log(balance));
	// }
	// const walletAddress = await arweave.wallets.jwkToAddress(wallet);
	// Set up SmartWeave client
	LoggerFactory.INST.logLevel('trace');
	LoggerFactory.INST.logLevel("trace", "DefaultStateEvaluator");
	LoggerFactory.INST.logLevel("trace", "HandlerBasedContract");
	LoggerFactory.INST.logLevel("trace", "HandlerExecutorFactory");
	const warp = WarpNodeFactory.forTesting(arweave);
	await mine()

	// NFT contract
	// const NFTDestWallet = await generateEmptyWallet(arweave);
	const NFTSrc = readFileSync(join(__dirname, "../build/contracts/NFT/contract.js"), "utf8");
	// const NFTInit = JSON.parse(readFileSync(join(__dirname, "../build/contracts/NFT/init.json"), "utf8"))
	// const NFTDestAddr = await arweave.wallets.jwkToAddress(NFTDestWallet);
	// NFTInit.owner = NFTDestAddr;
	// const NFTContractID = await warp.createContract.deploy({ wallet, initState: JSON.stringify(NFTInit, null, 2), src: NFTSrc }, false)
	// console.log({ NFTContractID })

	const src = new SourceImpl(arweave)
	const tst = await src.save({ src: NFTSrc }, wallet)
	// const NFTtx = await arweave.createTransaction({ data: NFTSrc, tags: [{ name: "Content-Type" }] }, wallet)
	// await arweave.transactions.sign(NFTtx, wallet)
	// await arweave.transactions.post(NFTtx)
	console.log(tst)
	const NFTContractID = tst.id
	await mine()

	// pool contract
	// contract definitions load
	const destinationWallet = await generateEmptyWallet(arweave);
	const contractSrc = readFileSync(join(__dirname, "../build/contracts/pool/contract.js"), "utf8");

	let initState = readFileSync(join(__dirname, "../build/contracts/pool/init.json"), "utf8");
	const initJson = JSON.parse(initState);
	const destAddress = await arweave.wallets.jwkToAddress(destinationWallet);
	initJson.owner = destAddress;
	initState = JSON.stringify(initJson, null, 2);


	arweave.wallets.getBalance(destAddress).then(
		(balance) => console.log(balance));

	// deploy to arweave - local if test, arweave.net if not
	const contractTxId = await warp.createContract.deploy({
		wallet,
		initState: initState,
		src: contractSrc
	});

	await mine();
	const contribAmount = 1000000;

	// interact with contract
	const conInteractor = warp.contract(contractTxId).connect(wallet);
	conInteractor.setEvaluationOptions({ walletBalanceUrl: /* "https://testnet.redstone.tools"  */"http://localhost:1984" })

	// test whether arlocal has wallet_list API
	//console.log(`fetching wallet_list`);
	//const wallet_list = await arweave.api.get(`/block/height/1/wallet_list`);
	//console.log(wallet_list);
	// read state
	const state = await conInteractor.readState();
	console.log("State before any interactions");
	console.log(JSON.stringify(state, null, 2));

	// TEST 1: Send "contribute" transaction and read state
	console.log("");
	console.log("TEST 1");
	console.log(`Sending 'contribute' interaction from ${walletAddress}`);
	await conInteractor.writeInteraction({
		function: "contribute"
	}, [], {
		target: destAddress,
		winstonQty: `${contribAmount}`
	});

	await mine();
	console.log("Interaction has been sent");

	// read state again
	const state_1 = await conInteractor.readState();
	console.log("state after first contribution");
	console.log(JSON.stringify(state_1, null, 2));

	// TEST 2: Resend "contribute" transaction from same address
	console.log("TEST 2");
	console.log(`Sending 'contribute' interaction from wallet: ${wallet}`);
	await conInteractor.writeInteraction({
		function: "contribute"
	}, [], {
		target: destAddress,
		winstonQty: `${contribAmount}`
	});
	await mine();
	// read state
	const state_2 = await conInteractor.readState();
	console.log("State after TEST 2");
	console.log(JSON.stringify(state_2, null, 2));

	// TEST 2.b: Read from different smartweave client
	const fresh_smartweave = WarpNodeFactory.memCached(arweave);
	const fresh_interactor = fresh_smartweave.contract(contractTxId).connect(wallet);
	const state_2b = await fresh_interactor.readState();
	console.log("State after TEST 2.b");
	console.log(JSON.stringify(state_2b, null, 2));

	// TEST 3: Send "contribute" transaction from different address
	console.log("");
	console.log("TEST 3");
	const wallet2 = await generateFundedWallet(arweave);
	console.log(`Sending another 'contribute' txn from wallet: ${wallet2}`);
	const conInteractor2 = warp.contract(contractTxId).connect(wallet2);
	await conInteractor2.writeInteraction({
		function: "contribute"
	}, [], {
		target: destAddress,
		winstonQty: '500000000000'
	});
	await mine();
	console.log("Interaction has been sent from a different wallet");

	// read state one more time
	let state_3 = await conInteractor2.readState();
	console.log("state after TEST 3");
	console.log(JSON.stringify(state_3, null, 2));

	// mint extra tokens in destAddress for testing
	console.log("");
	console.log("TEST 4");
	console.log(`Minting extra tokens in destAddress to check if further contributions are handled correctly, and then sending from ${wallet}`);
	await arweave.api.get(`/mint/${destAddress}/2000000000000`);
	await mine();
	await conInteractor.writeInteraction({
		function: "contribute"
	}, [], {
		target: destAddress,
		// target: 'nDNofBkdEJDteCmSJcVJxxAAJz5UEHAXze1hU2GBn-A',
		winstonQty: '500000000000'
	});
	await mine();
	const state_4 = await conInteractor.readState();
	console.log("State after TEST 4");
	console.log(JSON.stringify(state_4, null, 2));


	await mine();
	console.log("Finished Pool contract tests!")
	await mine();

	const pool = new FundingPool({ arweave, poolId: contractTxId, balanceUrl: "http://localhost:1984", nftContractSrc: NFTContractID })

	const { tags, initialState } = await pool.getNftData("1111111")

	const dtx = await arweave.createTransaction({ data: "Hello, world!" }, wallet)
	dtx.addTag("Content-Type", "text/plain")
	await arweave.transactions.sign(dtx, wallet)
	await arweave.transactions.post(dtx)

	const manifest = {
		manifest: "arweave/paths",
		version: "0.1.0",
		index: {},
		paths: {}
	}

	manifest.paths["test.txt"] = { id: dtx.id }
	manifest.index = { path: "test.txt" }

	const tx = await warp.createContract.deployFromSourceTx({
		srcTxId: NFTContractID,
		wallet,
		initState: JSON.stringify(initialState),
		data: { "Content-Type": "application/x.arweave-manifest+json", body: JSON.stringify(manifest) },
		tags
	})
	// this should use the bundlr for production environments

	await mine()
	const wallet2Address = await arweave.wallets.getAddress(wallet2)
	const wallets = [walletAddress, wallet2Address]
	const owner = Object.entries(initialState.balances)[0][0]
	const dg = wallets.find(w => w != owner) as string;
	const ownerWall = walletAddress === owner ? wallet : wallet2
	console.log(dg)

	LoggerFactory.INST.logLevel('trace');
	LoggerFactory.INST.logLevel("trace", "DefaultStateEvaluator");
	LoggerFactory.INST.logLevel("trace", "HandlerBasedContract");
	LoggerFactory.INST.logLevel("trace", "HandlerExecutorFactory");

	const nftContractInteractor = warp.contract(tx).connect(ownerWall);

	console.log({ state: await nftContractInteractor.readState() })

	await nftContractInteractor.writeInteraction({
		function: "transfer",
		target: dg, qty: 0.9
	});
	await mine()
	console.log({ state: await nftContractInteractor.readState() })

	console.log({
		state: await nftContractInteractor.viewState({
			function: "balance",
			target: owner
		})
	})

	await mine()

	console.log({ state: await nftContractInteractor.readState() })

	console.log("done!")
	// await stop()
}

runTests()
