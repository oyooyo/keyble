#!/usr/bin/env node

/**
 * Use "strict" mode.
 */
'use strict';

/**
 * The "register_user" submodule.
 * Command line tool for registering users on eQ-3 eqiva Bluetooth smart locks.
 * @module register_user
 */

/**
 * Import/require the "keyble" submodule.
 */
const keyble = require('./keyble');

/**
 * Import required functions from the "utils" submodule.
 */
const {ansi_colorize, wait_milliseconds} = require('./utils.js');

/**
 * Import required functions from the "cli" submodule.
 */
const {ArgumentParser, generate_input_strings} = require('./cli.js');

/**
 * The default user name to use when registering new users.
 * @constant
 * @type {string}
 */
const DEFAULT_USER_NAME = 'keyble';

const register_user = async (key_card_data_string, user_name) => {
	// Parse/Decode the information encoded in the QR-Codes on the "Key Card"s
	const {address, register_key, serial} = keyble.key_card.parse(key_card_data_string);
	console.log(`Registering user on Smart Lock with address "${ansi_colorize(address)}", card key "${ansi_colorize(register_key)}" and serial "${ansi_colorize(serial)}"...`);
	const key_ble = new keyble.Key_Ble({
		address: address,
	});
	const user_data = await key_ble.pairing_request(register_key);
	console.log(`User registered!`);
	console.log(`Use arguments: "${ansi_colorize(`--address ${address} --user_id ${user_id} --user_key ${user_key}`)}"`);
	console.log(`Setting user name to "${user_name}"...`);
	await key_ble.set_user_name(user_name);
	console.log(`User name changed!`);
	console.log(`Finished registering user.`);
	await key_ble.disconnect();
}

const register_users_then_exit = async (qr_code_data, user_name) => {
	// Print a short message remembering the user that he needs to activate the Smart Lock pairing mode
	console.log(ansi_colorize('Press and hold "Unlock" button until the yellow light flashes in order to enter pairing mode', '41'));
	if (qr_code_data) {
		// If the QR code was provided on the command line, give the user 10 seconds to press and hold the "unlock" button for pairing
		await wait_milliseconds(10000);
	}
	try {
		for await (let key_card_data_string of generate_input_strings(qr_code_data, process.stdin)) {
			await register_user(key_card_data_string, user_name);
		}
		// "noble", the Bluetooth library being used, does not properly shut down. An explicit process.exit() is required when finished.
		process.exit(0);
	} catch (error) {
		console.error(error);
		process.exit(1);
	}
}

/**
 * MAIN
 */
// Only execute the following code when run from the command line
if (require.main === module) {
	// Set up the command line arguments parser.
	const argument_parser = new ArgumentParser({
		description: "Register users on eQ-3 eqiva Bluetooth smart locks.",
	});
	argument_parser.addArgument(['--user_name', '-n'], {
		defaultValue: DEFAULT_USER_NAME,
		type: 'string',
		help: `The name of the user to register (default: "${DEFAULT_USER_NAME}")`,
	});
	argument_parser.addArgument(['--qr_code_data', '-q'], {
		required: false,
		type: 'string',
		help: 'The information encoded in the QR-Code of the key card. If not provided on the command line, the data will be read as input lines from STDIN instead',
	});
	const {qr_code_data, user_name} = argument_parser.parseArgs();
	// Register users, then exit
	register_users_then_exit(qr_code_data, user_name);
}

