`#!/usr/bin/env node

'use strict'`

# Command line tool for controlling (lock/unlock/open) eqiva eQ-3 Bluetooth smart locks

# Import/Require the local "cli" module that provides some useful functions for CLI scripts
cli = require('./cli')

# Import/Require the "keyble" module that provides a library for the eqiva eQ-3 Bluetooth smart locks
keyble = require('./keyble')

# The default auto-disconnect time, in seconds
default_auto_disconnect_time = 30.0

# The default status update time, in seconds
default_status_update_time = 600.0

# The default timeout time, in seconds
default_timeout_time = 45.0

# ----
# MAIN
# ----
# Only execute the following code when run from the command line
if (require.main is module)
	# Parse the command line arguments
	argument_parser = new cli.ArgumentParser
		description: 'Control (lock/unlock/open) an eqiva eQ-3 Bluetooth smart lock.'
	argument_parser.addArgument ['--address', '-a'],
		required: true
		type: 'string'
		help: 'The smart lock\'s MAC address'
	argument_parser.addArgument ['--user_id', '-u'],
		required: true
		type: 'int'
		help: 'The user ID'
	argument_parser.addArgument ['--user_key', '-k'],
		required: true
		type: 'string'
		help: 'The user key'
	argument_parser.addArgument ['--auto_disconnect_time', '-adt'],
		type: 'float'
		defaultValue: default_auto_disconnect_time
		help: "The auto-disconnect time. If connected to the lock, the connection will be automatically disconnected after this many seconds of inactivity, in order to save battery. A value of 0 will deactivate auto-disconnect (default: #{default_auto_disconnect_time})"
	argument_parser.addArgument ['--status_update_time', '-sut'],
		type: 'float'
		defaultValue: default_status_update_time
		help: "The status update time. If no status information has been received for this many seconds, automatically connect to the lock and query the status. A value of 0 will deactivate status updates (default: #{default_status_update_time})"
	argument_parser.addArgument ['--timeout', '-t'],
		type: 'float'
		defaultValue: default_status_update_time
		help: "The timeout time. Commands must finish within this many seconds, otherwise there is an error. A value of 0 will deactivate timeouts (default: #{default_timeout_time})"
	argument_parser.addArgument ['--command', '-c'],
		choices: ['lock', 'open', 'unlock', 'status']
		required: false
		type: 'string'
		help: 'The command to perform. If not provided on the command line, the command(s) will be read as input lines from STDIN instead'
	args = argument_parser.parseArgs()

	key_ble = new keyble.Key_Ble
		address: args.address
		user_id: args.user_id
		user_key: args.user_key
		auto_disconnect_time: args.auto_disconnect_time
		status_update_time: args.status_update_time
	key_ble.on 'status_change', (status_id, status_string) ->
		console.log status_string
	cli.process_input args.command, process.stdin, (command) ->
		keyble.utils.time_limit((switch command
			when 'lock' then key_ble.lock()
			when 'unlock' then key_ble.unlock()
			when 'open' then key_ble.open()
			when 'status' then key_ble.request_status()
			else Promise.reject("Unknown command \"#{command}\"")
		), (args.timeout * 1000)).catch (error) ->
			console.error "Error: #{error}"
	.then ->
		# "noble", the Bluetooth library being used, does not properly shut down. An explicit process.exit() is required when finished
		cli.exit()
