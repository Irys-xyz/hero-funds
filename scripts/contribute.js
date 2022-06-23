// this makes a live contribution! be careful :D

const fs = require('fs');
const path = require('path');
const Arweave = require('arweave');
const { SmartWeaveNodeFactory, LoggerFactory } = require("redstone-smartweave");


async function archivePoolClient(wallet, contractId, amount) {
        const arweave = Arweave.init({
                host: "arweave.net",
                port: 443,
                protocol: "https",
                timeout: 20000,
                logging: false,
        });

	const smartweave = SmartWeaveNodeFactory.memCachedBased(arweave).useArweaveGateway().build();
	const contract = smartweave.contract(contractId).connect(wallet);
	
	// state before 
	console.log("state before 'contribute' txn");
	const { state, validity } = await contract.readState();
        console.log(JSON.stringify(state));
	const owner = state.owner;
	// send contribution
	console.log("sending 'contribute' txn");
	const interactionTx = await contract.writeInteraction({
                function: "contribute"
        }, [], {
                target: state.owner,
		// .000001 AR
                winstonQty: amount
        });
	console.log(`interaction sent! id: ${interactionTx}`);
}

const wallet = JSON.parse(fs.readFileSync("wallet.json").toString());
const contractId = process.argv[2];
const amount = process.argv[3];
archivePoolClient(wallet, contractId, amount).catch((e) => console.log(e));
