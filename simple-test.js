// File simple-demo.js

const fs = require('fs');
const path = require('path');
const Arweave = require('arweave');
const { SmartWeaveNodeFactory, LoggerFactory } = require("redstone-smartweave");
const { default: ArLocal } = require("arlocal");
const test = true;
console.log(`Testing = ${test}`);

async function generateFundedWallet(arweave) {
	const wallet = await arweave.wallets.generate();
	const walletAddress = await arweave.wallets.jwkToAddress(wallet);
	await arweave.api.get(`/mint/${walletAddress}/2000000000000`);
	return wallet;
}

async function generateEmptyWallet(arweave) {
	const wallet = await arweave.wallets.generate();
	return wallet;
}

(async () => {

	// Set up Arweave client
	let arweave;
	let wallet;
	let mine;

	if (test) {
		// Set up ArLocal
		const arLocal = new ArLocal(1985, false);
		await arLocal.start();

		arweave = Arweave.init({
			host: "localhost",
			port: 1985,
			protocol: "http"
		});
		wallet = await arweave.wallets.generate();
		mine = () => arweave.api.get("mine");

		// add funds to wallet
		const walletAddress = await arweave.wallets.jwkToAddress(wallet);
		await arweave.api.get(`/mint/${walletAddress}/3000000000000`);
		arweave.wallets.getBalance(walletAddress).then(
			(balance) => console.log(balance));

	}

	// Set up SmartWeave client
	LoggerFactory.INST.logLevel('debug');
	const smartweave = SmartWeaveNodeFactory.memCached(arweave);

	// contract definitions load
	const destinationWallet = await generateEmptyWallet(arweave);
	const contractSrc = fs.readFileSync(path.join(__dirname, "./src/contracts/0.4.84/contract.js"), "utf8");

	// some magic to insert new wallet for testing
	let initState = fs.readFileSync(path.join(__dirname, "./src/contracts/0.4.84/init.json"), "utf8");
	const initJson = JSON.parse(initState);
	const destAddress = await arweave.wallets.jwkToAddress(destinationWallet);
	initJson.owner = destAddress;
	initState = JSON.stringify(initJson, null, 2);

	// deploy to arweave - local if test, arweave.net if not
	const contractTxId = await smartweave.createContract.deploy({
		wallet,
		initState: initState,
		src: contractSrc
	});

	await mine();
	const contribAmount = 1000000;

	// interact with contract
	const conInteractor = smartweave.contract(contractTxId).connect(wallet);

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
	console.log(`Sending 'contribute' interaction from ${wallet}`);
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
	const fresh_smartweave = SmartWeaveNodeFactory.memCached(arweave);
	const fresh_interactor = fresh_smartweave.contract(contractTxId).connect(wallet);
	const state_2b = await fresh_interactor.readState();
	console.log("State after TEST 2.b");
	console.log(JSON.stringify(state_2b, null, 2));

	// TEST 3: Send "contribute" transaction from different address
	console.log("");
	console.log("TEST 3");
	const wallet2 = await generateFundedWallet(arweave);
	console.log(`Sending another 'contribute' txn from wallet: ${wallet2}`);
	const conInteractor2 = smartweave.contract(contractTxId).connect(wallet2);
	await conInteractor2.writeInteraction({
		function: "contribute"
	}, [], {
		target: destAddress,
		//target: 'nDNofBkdEJDteCmSJcVJxxAAJz5UEHAXze1hU2GBn-A',
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

	// read arweave wallet balance
	//	 arweave.wallets.jwkToAddress(wallet).then(
	//	 	(address) => arweave.wallets.getBalance(address).then(
	//	 			(balance) => console.log(balance)))
	//	
	//	arweave.wallets.getBalance('nDNofBkdEJDteCmSJcVJxxAAJz5UEHAXze1hU2GBn-A').then((balance) => console.log(balance));	
	// await arLocal.stop();
})();
