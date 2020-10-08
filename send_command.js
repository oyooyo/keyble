#!/usr/bin/env node

/**
 * Use "strict" mode.
 */
'use strict';

/**
 * The "send_command" submodule.
 * Command line tool for controlling (lock/unlock/open) eQ-3 eqiva Bluetooth smart locks.
 * @module send_command
 */

/**
 * Import/require the "keyble" submodule.
 */
const keyble = require('./keyble');

/**
 * Import required functions from the "cli" submodule.
 */
const {ArgumentParser, generate_input_strings} = require('./cli.js');

/**
 * The default auto-disconnect time, in seconds.
 */
const DEFAULT_AUTO_DISCONNECT_TIME = 15.0;

/**
 * The default status update time, in seconds.
 */
const DEFAULT_STATUS_UPDATE_TIME = 900.0;

/**
 * The default timeout time, in seconds.
 */
const DEFAULT_TIMEOUT_TIME = 30.0;

const send_commands_then_exit = async ({address, user_id, user_key, auto_disconnect_time, status_update_time, command, timeout}) => {
	try {
		const key_ble = new keyble.Key_Ble({
			address: address,
			user_id: user_id,
			user_key: user_key,
			auto_disconnect_time: auto_disconnect_time,
			status_update_time: status_update_time,
		});
		key_ble.on('status_change', (status_id, status_string) => {
			console.log(status_string);
		});
		for await (let input_command of generate_input_strings([command], process.stdin)) {
			const action = {
				lock: key_ble.lock,
				unlock: key_ble.unlock,
				open: key_ble.open,
				status: key_ble.request_status,
			}[input_command];
			if (! action) {
				throw new Error(`Unknown command "${command}"`);
			}
			await keyble.utils.time_limit(action.call(key_ble), (timeout * 1000));
		}
		// "noble", the Bluetooth library being used, does not properly shut down. An explicit process.exit() is required when finished.
		process.exit(0);
	} catch (error) {
		console.error `Error: ${error}`;
		process.exit(1);
	}
}

/**
 * MAIN
 */
// Only execute the following code when run from the command line
if (require.main == module) {
	// Set up the command line arguments parser.
	const argument_parser = new ArgumentParser({
		description: 'Control (lock/unlock/open) an eQ-3 eqiva Bluetooth smart lock.',
	});
	argument_parser.add_argument('--address', '-a', {
		required: true,
		type: String,
		help: 'The smart lock\'s MAC address',
	});
	argument_parser.add_argument('--user_id', '-u', {
		required: true,
		type: 'int',
		help: 'The user ID',
	});
	argument_parser.add_argument('--user_key', '-k', {
		required: true,
		type: String,
		help: 'The user key',
	});
	argument_parser.add_argument('--auto_disconnect_time', '-adt', {
		type: 'float',
		default: DEFAULT_AUTO_DISCONNECT_TIME,
		help: `The auto-disconnect time. If connected to the lock, the connection will be automatically disconnected after this many seconds of inactivity, in order to save battery. A value of 0 will deactivate auto-disconnect (default: ${DEFAULT_AUTO_DISCONNECT_TIME})`,
	});
	argument_parser.add_argument('--status_update_time', '-sut', {
		type: 'float',
		default: DEFAULT_STATUS_UPDATE_TIME,
		help: `The status update time. If no status information has been received for this many seconds, automatically connect to the lock and query the status. A value of 0 will deactivate status updates (default: ${DEFAULT_STATUS_UPDATE_TIME})`,
	});
	argument_parser.add_argument('--timeout', '-t', {
		type: 'float',
		default: DEFAULT_TIMEOUT_TIME,
		help: `The timeout time. Commands must finish within this many seconds, otherwise there is an error. A value of 0 will deactivate timeouts (default: ${DEFAULT_TIMEOUT_TIME})`,
	});
	argument_parser.add_argument('--command', '-c', {
		choices: ['lock', 'open', 'unlock', 'status'],
		required: false,
		type: String,
		help: 'The command to perform. If not provided on the command line, the command(s) will be read as input lines from STDIN instead',
	});
	// Parse the command line arguments and pass them to the send_commands_then_exit function.
	send_commands_then_exit(argument_parser.parse_args());
}

