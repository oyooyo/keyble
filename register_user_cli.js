#!/usr/bin/env node

'use strict';
var args, argument_parser, cli, keyble;

// Command line tool for registering users on eqiva eQ-3 Bluetooth smart locks

// Import/Require the local "cli" module that provides some useful functions for CLI scripts
cli = require('./cli');

// Import/Require the "keyble" module that provides a library for the eqiva eQ-3 Bluetooth smart locks
keyble = require('./keyble');

// ----
// MAIN
// ----
// Only execute the following code when run from the command line
if (require.main === module) {
  // Parse the command line arguments
  argument_parser = new cli.ArgumentParser({
    description: "Register users on eqiva eQ-3 Bluetooth smart locks."
  });
  argument_parser.addArgument(['--user_name', '-n'], {
    defaultValue: 'PC',
    type: 'string',
    help: 'The name of the user to register (default: "PC")'
  });
  argument_parser.addArgument(['--qr_code_data', '-q'], {
    required: false,
    type: 'string',
    help: 'The information encoded in the QR-Code of the key card. If not provided on the command line, the data will be read as input lines from STDIN instead'
  });
  args = argument_parser.parseArgs();
  // Print a short message remembering the user that he needs to activate the Smart Lock pairing mode
  console.log(cli.ansi_colorize('Press and hold "Unlock" button until the yellow light flashes in order to enter pairing mode', '41'));
  // If the key card data was passed directly on the command line, wait 10 seconds before proceeding, giving the user time to enter pairing mode
  cli.delay(args.qr_code_data ? 10000 : 0).then(function() {
    return cli.process_input(args.qr_code_data, process.stdin, function(key_card_data_string) {
      var key_ble, key_card_data;
      // Parse/Decode the information encoded in the QR-Codes on the "Key Card"s
      key_card_data = keyble.key_card.parse(key_card_data_string);
      console.log(`Registering user on Smart Lock with address "${key_card_data.address}", card key "${key_card_data.register_key}" and serial "${key_card_data.serial}"...`);
      key_ble = new keyble.Key_Ble(key_card_data.address);
      return key_ble.pairing_request(key_card_data.register_key).then(function(user_data) {
        console.log("User registered. Use arguments: " + cli.ansi_colorize(`--address ${key_card_data.address} --user_id ${user_data.user_id} --user_key ${user_data.user_key}`, '44'));
        console.log(`Setting user name to "${args.user_name}"...`);
        return key_ble.set_user_name(args.user_name);
      }).then(function(user_data) {
        console.log("User name changed, finished registering user.");
        return key_ble.disconnect();
      }).catch(function(error) {
        // An error occurred while registering the user. Print the error message and exit with exit code 1
        console.error(error);
        return cli.exit(1);
      });
    });
  }).then(function() {
    // "noble", the Bluetooth library being used, does not properly shut down. An explicit process.exit() is required when finished
    return cli.exit();
  });
}

//# sourceMappingURL=register_user_cli.js.map
