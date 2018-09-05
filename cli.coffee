'use strict'

# Import/Require the "argparse" module that provides an easy to use command line argument parser
argparse = require('argparse')

# Returns the ANSI escape code for ANSI color code <code>
ansi_color_code = (code) ->
	"\x1b[#{code}m"

# Returns true if the passed argument <value> is neither null nor undefined
is_valid_value = (value) ->
	((value isnt undefined) and (value isnt null))

# Returns the first value in <values...> that is neither null nor undefined
first_valid_value = (values...) ->
	for value in values
		if is_valid_value(value)
			return value
	return

# Colorize string <string> by ANSI-escaping it with ANSI sequence <color>
ansi_colorize = (string, code) ->
	code = first_valid_value(code, 31)
	"#{ansi_color_code(code)}#{string}#{ansi_color_code(0)}"

# Returns a Promise that resolves after <milliseconds> milliseconds (defaults to 0)
delay = (milliseconds) ->
	milliseconds = first_valid_value(milliseconds, 0)
	new Promise (resolve, reject) ->
		setTimeout ->
				resolve()
			, milliseconds

# Exit the current process with status code <status_code>. "noble" (the Bluetooth LE library being used) currently requires so: https://github.com/noble/noble/issues/299
exit_process = (status_code) ->
	status_code = first_valid_value(status_code, 0)
	process.exit(status_code)

# Checks if <value> is an array. Returns true if it is an array, false otherwise
is_array = (value) ->
	Array.isArray(value)

# Returns a function with argument <value> that returns true if <value> is of type <type_string>, false otherwise
is_of_type = (type_string) ->
	(value) ->
		(typeof(value) is type_string)

# Returns true if the passed argument <value> is a string, false otherwise
is_string = is_of_type('string')

# Process one or more <input_sources...>, and call <input_handler> for each input string, passing the input strings as argument to <input_handler>. Every input source must either be a string, an array of strings, or a Readable stream like process.stdin
process_input = (input_sources..., input_handler) ->
	new Promise (resolve, reject) ->
		input_source = input_sources.find (input_source) ->
			(is_valid_value(input_source) and (not is_array(input_source) or (input_source.length > 0)))
		if is_string(input_source)
			# The input source is a single string; simply pass the string to the input handler
			input_handler(input_source)
			resolve()
		else if is_array(input_source)
			# The input source is a non-empty array; pass all elements of the array to the input handler
			for input_element in input_source
				input_handler(input_element)
			resolve()
		else
			# The input source is expected to be a readable stream; read the stream line by line and pass the stripped lines to the input handler
			readline = require('readline')
			readline_interface = readline.createInterface
				input: input_source
				output: null
			readline_interface.on 'line', (input_line) ->
				input_handler(input_line.trim())
				return
			readline_interface.on 'close', ->
				resolve()
				return
		return

# What this module exports
module.exports =
	ArgumentParser: argparse.ArgumentParser
	ansi_colorize: ansi_colorize
	delay: delay
	exit: exit_process
	process_input: process_input
