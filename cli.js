'use strict';

/**
 * The "cli" submodule.
 * Exports functions etc. being used by the included command line programs, but which are not required when using keyble as a library.
 * @module cli
 */

/**
 * Import/require the "argparse" module that is being used parsing command line arguments.
 * @requires argparse
 * @see {@link https://github.com/nodeca/argparse#readme}
 */
const argparse = require('argparse');

/**
 * Import/require the "readline" module that is being used reading from input streams.
 * @requires readline
 * @see {@link https://nodejs.org/api/readline.html}
 */
const readline = require('readline');

/**
 * Async generator function that yields input strings from the the first valid "input source".
 * @async
 * @generator
 * @param {string[]|ReadableStream} - One or more "input sources". Each input source can either be an array of strings or a readable stream.
 * @yields {string} The next input string.
 */
const generate_input_strings = async function*(command_line_input_strings, readable_stream) {
	command_line_input_strings = command_line_input_strings.filter((input_string) => (typeof(input_string) === 'string'));
	if (command_line_input_strings.length > 0) {
		// Yield strings from the command_line_input_strings array.
		for (let input_string of command_line_input_strings) {
			yield(input_string);
		}
	} else {
		// Yield lines read from the readable_stream.
		const readline_interface = readline.createInterface({
			input: readable_stream,
			output: null,
		});
		for await (let input_line of readline_interface) {
			yield(input_line.trim());
		}
	}
}

/**
 * What this module exports.
 */
module.exports = {
	ArgumentParser: argparse.ArgumentParser,
	generate_input_strings: generate_input_strings,
};

