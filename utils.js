'use strict';

/**
 * The "utils" submodule.
 * Contains a few generally useful functions that are not specific to the eqiva smart lock, but could theoretically be used in other projects as well.
 * Previously, these functions were part of the "keyble" submodule. I decided to pull them into a separate submodule, so that the "keyble" submodule becomes shorter and only contains code that is directly related to the smart lock.
 * @module utils
 */

/**
 * Returns the ANSI escape code for an ANSI color code.
 * @param {number|string} code - The ANSI color code.
 * @returns {string} An ANSI escape code.
 */
const ansi_color_code = (code) =>
	`\x1b[${code}m`

/**
 * Colorize a string by ANSI-escaping it with an ANSI sequence.
 * @param {string} string - The string to colorize.
 * @param {number|string} - The ANSI color code to colorize the string with.
 * @returns {string} The colorized string.
 */
const ansi_colorize = (string, code=31) =>
	`${ansi_color_code(code)}${string}${ansi_color_code(0)}`

/**
 * Checks if two byte arrays are equal.
 * @param {Uint8Array} array_1 - The first byte array.
 * @param {Uint8Array} array_2 - The second byte array.
 * @returns {boolean} True if both byte arrays are equal.
 */
const are_uint8arrays_equal = (uint8array_1, uint8array_2) =>
	((uint8array_1.length === uint8array_2.length) && uint8array_1.every((value, index) => (uint8array_2[index] === value)))

/**
 * Convert a byte array to a hexadecimal string.
 * @param {Uint8Array} uint8array - The byte array to convert.
 * @param {string} [separator=" "] - The string that will separate the individual bytes.
 * @param {string} [prefix=""] - If specified, the hexadecimal representation of each byte will be prefixed with this string.
 * @param {string} [suffix=""] - If specified, the hexadecimal representation of each byte will be suffixed with this string.
 * @param {string} [padding="0"] - The hexadecimal representation of each byte will be left-padded with this character to length 2.
 * @returns {string} A hexadecimal string representation of the specified byte array.
 */
const convert_uint8array_to_hex_string = (uint8array, separator=' ', prefix='', suffix='', padding='0') =>
	[...uint8array].map((byte) => `${prefix}${byte.toString(16).toUpperCase().padStart(2, padding)}${suffix}`).join(separator)

/**
 * Convert a byte array to an integer.
 * @param {Uint8Array} uint8array - The byte array to convert.
 * @param {number} [start_index=0] - The index of the start byte in uint8array to convert to integer. Can be negative, in which case this will count from the end.
 * @param {number} [end_index=uint8array.length] - The index of the end byte in uint8array to convert to integer (exclusive - the byte at this index will not be part of the integer). Can be negative, in which case this will count from the end.
 * @param {boolean} [big_endian=true] - If true, parse the integer value in big endian format, little endian otherwise.
 * @returns {number} The converted integer.
 */
const convert_uint8array_to_integer = (uint8array, start_index=0, end_index=uint8array.length, big_endian=true) =>
	uint8array.slice(start_index, end_index).reduce((accumulator, byte, index, integer_uint8array) =>
		(accumulator + (byte << (8 * (big_endian ? (integer_uint8array.length - 1 - index) : index))))
	, 0)

// Canonicalize hexadecimal string <hex_string> by removing all non-hexadecimal characters, and converting all digits to lower case
const canonicalize_hex_string = ((hex_string) => hex_string.replace(/[^0-9A-Fa-f]/g, '').toLowerCase());

/**
 * Splits slicable into an array of chunks of length chunk_length (except for the last chunk, which may have a smaller length).
 * @param {Array|string} slicable - The value to split into chunks.
 * @param {number} - The length of the chunks.
 * @returns {Array} An array of chunks of the same length.
 */
const split_into_chunks = (slicable, chunk_length) => {
	const chunks = [];
	for (let index = 0; index < slicable.length; index += chunk_length) {
		chunks.push(slicable.slice(index, (index + chunk_length)));
	}
	return chunks;
}

/**
 * Convert a hexadecimal string to a byte array.
 * @param {string} hex_string - The hexadecimal string to convert. Must contain exactly two hexadecimal digits per byte.
 * @returns {Uint8Array} The converted byte array. An array of unsigned integer numbers in range 0..255.
 */
const convert_hex_string_to_uint8array = (hex_string) =>
	Uint8Array.from(split_into_chunks(canonicalize_hex_string(hex_string), 2).map((byte_hex_string) => parseInt(byte_hex_string, 16)))

/**
 * Tests if some value is neither null nor undefined.
 * @param {*} value - The value to test.
 * @returns {boolean} - true if value is neither null nor undefined, false otherwise.
 */
const is_neither_null_nor_undefined = (value) =>
	(! ((value === null) || (value === undefined)))

/**
 * Convert an iterable to an array.
 * @param iterable - The iterable to convert.
 * @returns {Uint8Array} iterable as an array.
 */
const convert_to_uint8array = (iterable) => {
	if (typeof(iterable) === 'string') {
		return convert_hex_string_to_uint8array(iterable);
	}
	return (is_neither_null_nor_undefined(iterable) ? Uint8Array.of(...iterable) : null)
}

/**
 * Convert a byte array-like object to a Buffer.
 * @param {Buffer|Uint8Array} value - The byte array-like object to convert to a Buffer. If it is a Buffer already, bytes will simply be returned.
 * @returns {Buffer} A corresponding Buffer instance.
 */
const convert_to_buffer = (value) =>
	(Buffer.isBuffer(value) ? value : Buffer.from(value))

/**
 * Convert a byte array-like object into several formats/representations.
 * @param {Buffer|Uint8Array} uint8array - The byte array-like object to convert.
 * @param {string} [long_format_separator=" "] - The separator character to be used in the "long" format.
 * @returns {object} An object with "buffer" (the byte array as a Buffer instance), "array" (the original byte array), "short" (the byte array as a short hexadecimal string without any non-hexadecimal characters) and "long" (the byte array as a long hexadecimal string, where the bytes are separated by string long_format_separator properties.
 */
const create_uint8array_formats = (uint8array, long_format_separator=' ') => {
	uint8array = convert_to_uint8array(uint8array);
	return {
		array: [...uint8array],
		uint8array: uint8array,
		buffer: convert_to_buffer(uint8array),
		long: convert_uint8array_to_hex_string(uint8array, long_format_separator),
		short: convert_uint8array_to_hex_string(uint8array, ''),
	};
}

/**
 * Create a new array filled with the values returned by the specified function.
 * @param {number} length - The length of the array to create.
 * @param {function} create_element_at_index - A function that will be called once for every element of the array to create. Receives a single argument, the zero-based index of the element to create.
 * @returns {Uint8Array} A new array with the elements created by the create_element_at_index function.
 */
const create_uint8array_of_length = (length, create_element_at_index) =>
	Uint8Array.from({length:length}, (value, index) => create_element_at_index(index))

/**
 * Creates a random integer value in the specified range.
 * @param {number} maximum_value - The maximum value / upper boundary of the range. This boundary is exclusive, the returned value will be smaller than this.
 * @param {number} minimum_value - The minimum value / lower boundary of the range. This boundary is inclusive, the returned value will be greater than or equal than this.
 * @returns {number} A random integer value in the specified range.
 */
const create_random_integer = (maximum_value, minimum_value=0) =>
	(Math.floor(Math.random() * (maximum_value - minimum_value)) + minimum_value)

/**
 * Creates a random integer value in range 0..255.
 * @function
 * @returns {number} A random integer value in range 0..255.
 */
const create_random_byte = () =>
	create_random_integer(256)

/**
 * Creates a new array filled with random bytes.
 * @param {number} length - The length of the array to create.
 * @returns {Uint8Array} A new array filled with random integers in range 0..255.
 */
const create_random_uint8array = (length) =>
	create_uint8array_of_length(length, create_random_byte)

/**
 * Import/Require the "events" module as "Event_Emitter".
 * @requires events
 * @see {@link https://nodejs.org/api/events.html#events_class_eventemitter}
 */
const Event_Emitter = require('events');

/**
 * Returns the smallest number equal or larger than than x that equals (offset + (x * step)).
 * @param {number} x - The number to compute the ceil for.
 * @param {number} [step=1] - The step value.
 * @param {number} [offset=1] - The offset value.
 * @returns {number} The smallest number equal or larger than than x that equals (offset + (x * step)).
 */
const generic_ceil = (x, step=1, offset=0) =>
	((Math.ceil((x - offset) / step) * step) + offset)

/**
 * Extracts 8 bits / a byte from an integer value.
 * @param {number} integer - The integer value to extract the byte from.
 * @param {number} byte_index - The zero-based byte index. byte_index 0 stands for the 8 least-significant bits.
 * @returns {number} The extracted byte value, an integer in range 0..255.
 */
const extract_byte_from_integer = (integer, byte_index) =>
	((integer >> (byte_index * 8)) & 255)

/**
 * Convert an integer value to a byte array.
 * @param {number} integer - The integer to convert.
 * @param {number} number_of_bytes - The number of bytes required for the value (=the length of the byte array being created).
 * @param {boolean} [big_endian=true] - If true, the created array will be big endian, little endian otherwise.
 * @returns {Uint8Array} The converted byte array.
 */
const convert_integer_to_uint8array = (integer, number_of_bytes, big_endian=true) =>
	create_uint8array_of_length(number_of_bytes, (index) => extract_byte_from_integer(integer, (big_endian ? (number_of_bytes - 1 - index) : index)))

/**
 * Checks if a certain bit in a value is set.
 * @param {number} value - The value.
 * @param {number} bit_index - The zero-based index of the bit to check. 0 means the least-significant bit.
 * @returns {boolean} True if the bit is set, false otherwise.
 */
const is_bit_set = (value, bit_index) =>
	((value & (1 << bit_index)) !== 0)

/**
 * End-pads an array with a specified element to a specified size.
 * @param {*[]} array - The array to end-pad.
 * @param {number} length - The length to pad the array to. If the original array's length is greater than or equal this length, the original array is returned unchanged.
 * @param {*} pad_element - The element to pad the array with.
 * @returns {*[]} The end-padded array.
 */
const pad_array_end = (array, length, pad_element) =>
	((length > array.length) ? Uint8Array.of(...array, ...Array(length - array.length).fill(pad_element)) : array)

/**
 * Generator function that yields the numbers in the specified range.
 * @param {number} [start=0] - The start value (inclusive).
 * @param {number} stop - The stop value (exclusive).
 * @param {number} [step=1] - The step value. How much the value will be increased or decreased (if step is negative) on each step.
 * @yields {number} The next number in the specified range.
 */
const range = function*(...args) {
	const [start, stop, step=1] = ((args.length > 1) ? args : [0, args[0]]);
	for (let current = start; ((step >= 0) ? (current < stop) : (current > stop)); current += step) {
		yield(current);
	}
}

/**
 * XOR a byte array with another byte array.
 * @param {Uint8Array} uint8array - The byte array to XOR. The returned byte array will have the same length as this array.
 * @param {Uint8Array} xor_uint8array - The byte array to XOR with. Doesn't need to have the same length as uint8array; if the end of this array is reached, it will continue at the beginning.
 * @param {number} [xor_uint8array_offset=0] - The index of the byte in xor_uint8array to start with.
 * @returns {Uint8Array} The XORed array. Will have the same length as uint8array.
 */
const xor_uint8arrays = (uint8array, xor_uint8array, xor_uint8array_offset=0) =>
	uint8array.map((byte, index) => (byte ^ xor_uint8array[(index + xor_uint8array_offset) % xor_uint8array.length]))

/**
 * Time-limits a Promise by creating a time-limited proxy Promise for the original Promise.
 * @param {Promise} promise - The promise to time-limit.
 * @param {number} timeout_millis - The time limit/timeout time, in milliseconds. If the original Promise does not resolve within this time, the returned proxy Promise will switch to "rejected" state. If this value is zero or less, the original Promise will be returned.
 * @param {String} [timeout_error_message="Promise did not resolve within ... milliseconds"] - The message of the Error that will be thrown if the original Promise does not resolve within time.
 * @returns {Promise} A time-limited proxy Promise for the original Promise.
 */
const time_limit_promise = (promise, timeout_millis, timeout_error_message=`Promise did not resolve within ${timeout_millis} milliseconds`) =>
	((timeout_millis <= 0) ? promise : (new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			reject(new Error(timeout_error_message));
		}, timeout_millis);
		Promise.resolve(promise)
		.then((promise_result) => {
			resolve(promise_result);
		})
		.catch((promise_error) => {
			reject(promise_error);
		})
		.finally(() => {
			clearTimeout(timeout);
		});
	})))

/**
 * Wait for the specified number of milliseconds.
 * @async
 * @param {number} milliseconds - The number of milliseconds to wait.
 * @return {Promise} A Promise that resolves after the specified number of milliseconds.
 */
const wait_milliseconds = (milliseconds) =>
	((milliseconds > 0) ? (new Promise((resolve, reject) => {
		setTimeout(() => {
			resolve();
		}, milliseconds);
	})) : Promise.resolve())

/**
 * Convert a string to a UTF-8-encoded byte array.
 * @param {string} string - The string to convert.
 * @returns {Uint8Array} The converted, UTF-8-encoded byte array.
 */
const convert_string_to_utf8_encoded_uint8array = (string) =>
	convert_to_uint8array(Buffer.from(string, 'utf8'))

/**
 * Convert UTF-8-encoded byte array to a string.
 * @param {Uint8Array} uint8array - The UTF-8-encoded byte array to convert.
 * @returns {string} The converted string.
 */
const convert_utf8_encoded_uint8array_to_string = (uint8array) =>
	Buffer.from(uint8array).toString('utf8')

/**
 * Convert an array of objects to an object/dictionary of objects, where each property key/name is the value of the specified property of the object, and the property value is the object itself.
 * @param {Object[]} objects_array - The array of objects to convert.
 * @param {string} property_name - The name of the property to use as key for the converted object.
 * @returns {Object} The mapped object.
 */
const create_lookup_table_by_object_property_value = (objects_array, property_name) => {
	const dictionary = {};
	for (let object of objects_array) {
		dictionary[object[property_name]] = object;
	}
	return dictionary;
}

/**
 * Converts a boolean or unsigned integer value to a bitmask.
 * @param {number|boolean} value - The value to get the bitmask for.
 * @param {number} bit_index - The index of the lowest bit.
 * @returns {number} The bitmask for the value.
 */
const bit_mask_for_value = (value, bit_index) =>
	((+value) << bit_index)

// Canonicalize the MAC address <mac_address> (a string)
const canonicalize_mac_address = ((mac_address) => split_into_chunks(canonicalize_hex_string(mac_address), 2).join(':'));

/**
 * Register a temporary event listener.
 * 
 * @param {Object} event_emitter - The event emitter to register the temporary event on.
 * @param {String} event_id - The ID of the event to subscribe to.
 * @param {function} event_listener - The temporary callback function to be called when the event occurs. If this function returns true, the event listener will be unregistered.
 */
const register_temporary_event_listener = ((event_emitter, event_id, event_listener) => {
	const event_listener_proxy = ((...event_args) => {
		if (event_listener(...event_args) === true) {
			event_emitter.off(event_id, event_listener_proxy);
		}
	});
	event_emitter.on(event_id, event_listener_proxy);
});

/**
 * What this module exports.
 */
module.exports = {
	ansi_colorize: ansi_colorize,
	are_uint8arrays_equal: are_uint8arrays_equal,
	convert_uint8array_to_hex_string: convert_uint8array_to_hex_string,
	convert_uint8array_to_integer: convert_uint8array_to_integer,
	convert_hex_string_to_uint8array: convert_hex_string_to_uint8array,
	convert_to_uint8array: convert_to_uint8array,
	create_uint8array_formats: create_uint8array_formats,
	create_random_uint8array: create_random_uint8array,
	Event_Emitter: Event_Emitter,
	generic_ceil: generic_ceil,
	convert_integer_to_uint8array: convert_integer_to_uint8array,
	is_bit_set: is_bit_set,
	pad_array_end: pad_array_end,
	split_into_chunks: split_into_chunks,
	range: range,
	xor_uint8arrays: xor_uint8arrays,
	time_limit_promise: time_limit_promise,
	wait_milliseconds: wait_milliseconds,
	convert_string_to_utf8_encoded_uint8array: convert_string_to_utf8_encoded_uint8array,
	convert_utf8_encoded_uint8array_to_string: convert_utf8_encoded_uint8array_to_string,
	create_lookup_table_by_object_property_value: create_lookup_table_by_object_property_value,
	bit_mask_for_value: bit_mask_for_value,
	canonicalize_mac_address: canonicalize_mac_address,
	canonicalize_hex_string: canonicalize_hex_string,
	register_temporary_event_listener: register_temporary_event_listener,
};

