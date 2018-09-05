#!/usr/bin/env coffee
#`#!/usr/bin/env node
#
#'use strict'`

# Command line tool for controlling (lock/unlock/open) eqiva eQ-3 Bluetooth smart locks

# Import/Require the local "cli" module that provides some useful functions for CLI scripts
cli = require('./cli')

# Import/Require the "keyble" module that provides a library for the eqiva eQ-3 Bluetooth smart locks
keyble = require('./keyble')

# ----
# MAIN
# ----
# Only execute the following code when run from the command line
if require.main is module
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
	argument_parser.addArgument ['--command', '-c'],
		choices: ['lock', 'open', 'unlock']
		required: false
		type: 'string'
		help: 'The command to perform. If not provided on the command line, the command(s) will be read as input lines from STDIN instead'
	args = argument_parser.parseArgs()

	key_ble = new keyble.Key_Ble(args.address, args.user_id, args.user_key)
	cli.process_input args.command, process.stdin, (command) ->
		console.log "Sending command \"#{command}\"..."
		key_ble.send_command({'lock':0, 'unlock':1, 'open':2}[command])
		.then ->
			console.log "Command \"#{command}\" sent."
			key_ble.disconnect()
		.catch (error) ->
			console.error "Error: #{error}"
	.then ->
		# TODO the delay is a dirty hack that should be removed later on. "process_input" above currently resolves before the commands are actually being sent; the 5 seconds delay hopefully ensures that the command is sent before the program exits via cle.exit()
		cli.delay(5000)
	.then ->
		# "noble", the Bluetooth library being used, does not properly shut down. An explicit process.exit() is required when finished
		cli.exit()
