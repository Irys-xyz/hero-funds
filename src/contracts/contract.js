
function addOrUpdateBigStrings(object, key, qty) {
	if (object[key]) {
		object[key] = (BigInt(object[key]) + qty).toString();
	} else {
		object[key] = qty.toString();
	}
}

function addOrUpdateIntStrings(object, key, qty) {
	if (object[key]) {
		object[key] = (parseInt(object[key]) + qty).toString();
	} else {
		object[key] = qty.toString();
	}
}

function NumberMult(str, scalar) {
	(Number(str) * scalar).toString();
}

export async function handle(state, action) {
	const balances = state.balances;
	const caller = action.caller;
	switch (action.input.function) {
		case "contribute": {
			const contribution = BigInt(SmartWeave.transaction.quantity);
			const target = SmartWeave.transaction.target;
			const totalSupply = parseInt(state.totalSupply);
			const existingBalance = BigInt(await SmartWeave.arweave.wallets.getBalance(state.owner)) - contribution;

			// check inputs
			if (target != state.owner) {
				throw new ContractError(`Please fund the correct owner: ${state.owner}.`);
			}
			if (contribution == 0) {
				throw new ContractError(`Please fund non-zero amount`);
			}

			if (existingBalance == 0) {
				// totalSupply==0 => existingBalance==0, but not other way round
				// mint 100% of supply (1 M tokens)
				state.totalSupply = "1000000";
				state.tokens = {};
				state.tokens[caller] = "1000000";

				addOrUpdateBigStrings(state.contributors, action.caller, contribution);
				state.totalContributions = (BigInt(state.totalContributions) + contribution).toString();
			} else {
				// calculate new mints
				const mintedTokens = parseInt((Number(1000000000000n * contribution / existingBalance) / 1000000000000) * Number(totalSupply));
				const adjustmentFactor = Number(totalSupply) / Number(totalSupply + mintedTokens);
				// Object.keys(state.tokens).map(function(key, index) {
				let sum = 0;
				for (let key in state.tokens) {
					const newAlloc = parseInt(state.tokens[key] * adjustmentFactor);
					sum += newAlloc;
					state.tokens[key] = newAlloc.toString();
				};
				addOrUpdateIntStrings(state.tokens, action.caller, totalSupply - sum);
				addOrUpdateBigStrings(state.contributors, action.caller, contribution);
				state.totalContributions = (BigInt(state.totalContributions) + contribution).toString();

			}
			return { state };
		}
		default: {
			throw new ContractError(
				`No action ${action.input.function} exists. Please send a valid action.`
			);
		}
	}

}