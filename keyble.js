'use strict';

/**
 * The "keyble" submodule.
 * For controlling the "key-ble" Bluetooth Low Energy Smart Door Locks from eqiva.
 * @module keyble
 */

// Import the message types etc. from the "message_types" submodule.
const {
	Fragment_Ack_Message,
	Close_Connection_Message,
	Command_Message,
	Connection_Info_Message,
	Connection_Request_Message,
	Pairing_Request_Message,
	Status_Changed_Notification_Message,
	Status_Info_Message,
	Status_Request_Message,
	User_Name_Set_Message,
	MESSAGE_TYPES_BY_ID,
} = require('./message_types.js');

// Import the required functions from the "utils" submodule.
const {are_byte_arrays_equal, convert_byte_array_to_hex_string, convert_byte_array_to_integer, convert_hex_string_to_byte_array, convert_to_byte_array, create_byte_array_formats, create_random_byte_array, Event_Emitter, generic_ceil, convert_integer_to_byte_array, is_bit_set, pad_array_end, split_into_chunks, range, xor_arrays, time_limit_promise} = require('./utils.js');

/**
 * Import/require the "simble" module that is being used for Bluetooth communication as "simble".
 * @requires simble
 * @see {@link https://github.com/oyooyo/simble#readme}
 */
const simble = require('simble');

/**
 * Import/Require the "debug" module as "create_log_debug_message_function".
 * @function
 * @param {string} namespace - The namespace that the "log debug message" function shall use.
 * @returns {function} A "log debug message" function that logs debug messages in the specified namespace.
 * @requires debug
 * @see {@link https://github.com/visionmedia/debug#readme}
 */
const create_log_debug_message_function = require('debug');

/**
 * Logs a debug message in the "keyble:communication" namespace.
 * @function
 * @param {string} message - The debug message to output.
 */
const log_communication_debug_message = create_log_debug_message_function('keyble:communication');

/**
 * Logs a debug message in the "keyble:event" namespace.
 * @function
 * @param {string} message - The debug message to output.
 */
const log_event_debug_message = create_log_debug_message_function('keyble:event');

//- _REQUIRE_ES_ 'library/convert_to_byte_array.js'
/**
 * Import/require the "aes-js" module that is being used for AES encryption as "aesjs".
 * @requires aes-js
 * @see {@link https://github.com/ricmoo/aes-js#readme}
 */
const aesjs = require('aes-js');

/**
 * AES-128-encrypt a byte array in ECB mode.
 * @param {number[]} data - The data to encrypt.
 * @param {number[]} key - The AES-128 key to encrypt the data with.
 * @returns {number[]} The encrypted data.
 */
const encrypt_aes_ecb = (data, key) =>
	convert_to_byte_array((new aesjs.ModeOfOperation.ecb(key)).encrypt(data))

//- _REQUIRE_ES_ 'library/convert_integer_to_byte_array.js'
/**
 * Compute a nonce.
 * @param {number} message_type_id - The ID of the message type.
 * @param {number[]} session_open_nonce - The session open nonce.
 * @param {number} security_counter - The security counter.
 * @returns {number[]} The computed nonce.
 */
const compute_nonce = (message_type_id, session_open_nonce, security_counter) =>
	[message_type_id, ...session_open_nonce, 0, 0, ...convert_integer_to_byte_array(security_counter, 2)]

//- _REQUIRE_ES_ 'library/generic_ceil.js'
//- _REQUIRE_ES_ 'library/pad_array_end.js'
//- _REQUIRE_ES_ 'library/convert_integer_to_byte_array.js'
//- _REQUIRE_ES_ 'library/range.js'
//- _REQUIRE_ES_ 'library/xor_arrays.js'
/**
 * Compute an "authentication value".
 * @param {number[]} data - The data to compute the authentication value for.
 * @param {number} message_type_id - The message type ID.
 * @param {number[]} session_open_nonce - The session open nonce.
 * @param {number} security_counter - The security counter.
 * @param {number[]} key - The AES-128 key.
 * @returns {number[]} The authentication value.
 */
const compute_authentication_value = (data, message_type_id, session_open_nonce, security_counter, key) => {
	const nonce = compute_nonce(message_type_id, session_open_nonce, security_counter);
	const padded_data_length = generic_ceil(data.length, 16);
	const padded_data = pad_array_end(data, padded_data_length, 0);
	let encrypted_xor_data = encrypt_aes_ecb([9, ...nonce, ...convert_integer_to_byte_array(data.length, 2)], key);
	for (let padded_data_offset of range(0, padded_data_length, 16)) {
		encrypted_xor_data = encrypt_aes_ecb(xor_arrays(encrypted_xor_data, padded_data, padded_data_offset), key);
	}
	return xor_arrays(
		encrypted_xor_data.slice(0, 4),
		encrypt_aes_ecb([1, ...nonce, 0, 0], key),
	);
}

//- _REQUIRE_ES_ 'library/range.js'
//- _REQUIRE_ES_ 'library/convert_integer_to_byte_array.js'
//- _REQUIRE_ES_ 'library/xor_arrays.js'
/**
 * Encrypt or Decrypt a byte array that is part of a Message.
 * @param {number[]} byte_array - The byte array to encrypt or decrypt. If byte_array is already encrypted it will be decrypted and vice versa.
 * @param {number} message_type_id - The ID of the message type.
 * @param {number[]} session_open_nonce - The session open nonce.
 * @param {number} security_counter - The security counter.
 * @param {number[]} key - The AES-128 key to use for encryption/decryption.
 * @returns {number[]} The encrypted or decrypted byte array.
 */
const crypt_data = (byte_array, message_type_id, session_open_nonce, security_counter, key) => {
	const nonce = compute_nonce(message_type_id, session_open_nonce, security_counter);
	const keystream_byte_array = [];
	for (let index of range(Math.ceil(byte_array.length / 16))) {
		keystream_byte_array.push(...encrypt_aes_ecb([1, ...nonce, ...convert_integer_to_byte_array((index + 1), 2)], key));
	}
	return xor_arrays(byte_array, keystream_byte_array);
}

//- _REQUIRE_ES_ 'library/is_bit_set.js'
// TODO improve class with getters etc.
/**
 * This class represents a message fragment.
 * Bluetooth characteristics can only transfer a very limited number of bytes at once, so larger messages need to be split into several fragments/parts.
 */
const Message_Fragment = class {
	constructor(byte_array) {
		this.byte_array = byte_array;
	}
	get_status_byte() {
		return this.byte_array[0];
	}
	get_number_of_remaining_fragments() {
		return (this.get_status_byte() & 0x7F);
	}
	get_message_type_id() {
		if (! this.is_first()) {
			throw (new Error('Is not first fragment'));
		}
		return this.byte_array[1];
	}
	is_first() {
		return is_bit_set(this.get_status_byte(), 7);
	}
	is_last() {
		return (this.get_number_of_remaining_fragments() === 0);
	}
	is_complete_message() {
		return (this.is_first() && this.is_last());
	}
	get_data_byte_array() {
		return this.byte_array.slice(this.is_first() ? 2 : 1);
	}
}

/**
 * An object with all possible connections states.
 * @constant
 * @type {object}
 */
const CONNECTION_STATE = {
	DISCONNECTED: 0,
	CONNECTED: 1,
	NONCES_EXCHANGED: 2,
	SECURED: 3,
};

/**
 * A class that represents a eQ-3 eqiva Bluetooth smart lock.
 */
const Key_Ble = class extends Event_Emitter {

	constructor({address, user_id=255, user_key, auto_disconnect_time=15.0, status_update_time}) {
		super()
		this.address = simble.canonicalize.address(address);
		this.user_id = user_id;
		this.user_key = convert_to_byte_array(user_key);
		this.auto_disconnect_time = auto_disconnect_time;
		this.set_status_update_time(status_update_time);
		this.received_message_fragments = [];
		this.local_security_counter = 1;
		this.remote_security_counter = 0;
		this.state = CONNECTION_STATE.DISCONNECTED;
		this.lock_status_id = null;
	}

	set_status_update_time(status_update_time=600.0) {
		this.status_update_time = status_update_time;
		this.set_status_update_timer();
	}

	/**
	 * Await up to <timeout> (default: 1000) milliseconds for the event with ID <event_id> (a string). If <timeout> is 0, wait forever. Returns a Promise that resolves when the event occurs, and rejects if a timeout situation occurs
	 */
	await_event(event_id) {
		return (new Promise((resolve, reject) => {
			this.once(event_id, (...args) => {
				resolve(args);
			});
		}));
	}

	async await_message(message_type) {
		await this.await_event(`received:message:${message_type}`);
	}

	async set_user_name(user_name, user_id=this.user_id) {
		await this.send_message(User_Name_Set_Message.create({
			user_id: user_id,
			user_name: user_name,
		}));
		await this.await_message('USER_INFO');
	}

	async pairing_request(card_key) {
		card_key = convert_to_byte_array(card_key);
		this.user_key = create_random_byte_array(16);
		await this.ensure_nonces_exchanged();
		await this.send_message(Pairing_Request_Message.create({
			user_id: this.user_id,
			encrypted_pair_key: crypt_data(
				this.user_key,
				Pairing_Request_Message.id,
				this.remote_session_nonce,
				this.local_security_counter,
				card_key,
			),
			security_counter: this.local_security_counter,
			authentication_value: compute_authentication_value(
				pad_array_end([this.user_id, ...this.user_key], 23, 0),
				Pairing_Request_Message.id,
				this.remote_session_nonce,
				this.local_security_counter,
				card_key,
			),
		}));
		await this.await_message('ANSWER_WITH_SECURITY');
		return {
			user_id: this.user_id,
			user_key: convert_byte_array_to_hex_string(this.user_key, ''),
		};
	}

	emit(event_id, ...args) {
		log_event_debug_message(`Event: ${event_id}`);
		super.emit(event_id, ...args);
	}

	// Lock the smart lock
	async lock() {
		if (this.lock_status_id === 3) {
			return;
		}
		await this.send_command(0);
		await this.await_event('status:LOCKED');
	}

	// Unlock the smart lock
	async unlock() {
		if (this.lock_status_id === 2) {
			return;
		}
		await this.send_command(1);
		await this.await_event('status:UNLOCKED');
	}

	// Open the smart lock
	async open() {
		if (this.lock_status_id === 4) {
			return;
		}
		await this.send_command(2);
		await this.await_event('status:OPENED');
	}

	// Send a COMMAND message with command/action ID <command_id> (0 = lock, 1 = unlock, 2 = open)
	async send_command(command_id) {
		await this.send_message(Command_Message.create({
			command_id: command_id,
		}));
	}

	set_status_update_timer() {
		clearTimeout(this.status_update_timer);
		if (this.status_update_time > 0) {
			this.status_update_timer = setTimeout(() => {
				this.request_status();
			}, (this.status_update_time * 1000));
		}
	}

	on_message_fragment_received(message_fragment) {
		this.received_message_fragments.push(message_fragment);
		this.emit('received:fragment', message_fragment);
		if (message_fragment.is_last()) {
			const message_data_bytes = this.received_message_fragments.reduce((byte_array, message_fragment) =>
					[...byte_array, ...message_fragment.get_data_byte_array()]
				, []);
			let plain_message_data_bytes;
			const Message_Type = MESSAGE_TYPES_BY_ID[this.received_message_fragments[0].get_message_type_id()];
			if (Message_Type.is_secure()) {
				const message_security_counter = convert_byte_array_to_integer(message_data_bytes, -6, -4);
				if (message_security_counter <= this.remote_security_counter) {
					throw (new Error('Received message contains invalid security counter'));
				}
				const message_authentication_value = message_data_bytes.slice(-4);
				this.remote_security_counter = message_security_counter;
				plain_message_data_bytes = crypt_data(message_data_bytes.slice(0, -6), Message_Type.id, this.local_session_nonce, this.remote_security_counter, this.user_key);
				const computed_authentication_value = compute_authentication_value(plain_message_data_bytes, Message_Type.id, this.local_session_nonce, this.remote_security_counter, this.user_key);
				if (! are_byte_arrays_equal(message_authentication_value, computed_authentication_value)) {
					throw (new Error('Received message contains invalid authentication value'));
				}
			} else {
				plain_message_data_bytes = message_data_bytes;
			}
			this.received_message_fragments = [];
			this.on_message_received(Message_Type.create(plain_message_data_bytes));
		} else {
			this.send_message(Fragment_Ack_Message.create({
				fragment_id: message_fragment.get_status_byte(),
			}));
		}
	}

	on_message_received(message) {
		log_communication_debug_message(`Received message of type ${message.label}, data bytes <${convert_byte_array_to_hex_string(message.data_bytes, ' ')}>, data ${JSON.stringify(message.data)}`);
		this.emit('received:message', message);
		this.emit(`received:message:${message.label}`, message);
		switch(message.constructor) {
			case Connection_Info_Message:
				this.user_id = message.data.user_id;
				this.remote_session_nonce = message.data.remote_session_nonce;
				this.local_security_counter = 1;
				this.remote_security_counter = 0;
				break;
			case Status_Info_Message:
				const lock_status_id = message.data.lock_status;
				const lock_status_string = {
					0:'UNKNOWN',
					1:'MOVING',
					2:'UNLOCKED',
					3:'LOCKED',
					4:'OPENED',
				}[lock_status_id];
				this.emit('status_update', lock_status_id, lock_status_string);
				if (this.lock_status_id !== lock_status_id) {
					this.lock_status_id = lock_status_id;
					this.emit(`status:${lock_status_string}`, lock_status_id, lock_status_string);
					this.emit('status_change', lock_status_id, lock_status_string);
				}
				this.set_status_update_timer();
				break;
			case Status_Changed_Notification_Message:
				this.request_status();
				break;
			default:
				break;
		}
	}

	async send_message_fragment(message_fragment) {
		await this.ensure_connected();
		await this.send_characteristic.write(message_fragment.byte_array);
		if (! message_fragment.is_last()) {
			await this.await_message('FRAGMENT_ACK');
		}
	}

	async send_message_fragments(message_fragments) {
		const send_message_fragment_with_index = async (message_fragment_index) => {
			if (message_fragment_index < message_fragments.length) {
				await this.send_message_fragment(message_fragments[message_fragment_index]);
				await send_message_fragment_with_index(message_fragment_index + 1);
			} else {
				return;
			}
		}
		await send_message_fragment_with_index(0);
	}

	async send_message(message) {
		let message_data_bytes;
		if (message.is_secure()) {
			await this.ensure_nonces_exchanged();
			const padded_data = pad_array_end(message.data_bytes, generic_ceil(message.data_bytes.length, 15, 8), 0);
			crypt_data(padded_data, message.id, this.remote_session_nonce, this.local_security_counter, this.user_key);
			message_data_bytes = [
				...crypt_data(padded_data, message.id, this.remote_session_nonce, this.local_security_counter, this.user_key),
				...convert_integer_to_byte_array(this.local_security_counter, 2),
				...compute_authentication_value(padded_data, message.id, this.remote_session_nonce, this.local_security_counter, this.user_key),
			];
			this.local_security_counter++;
		} else {
			await this.ensure_connected();
			message_data_bytes = message.data_bytes;
		}
		const message_fragments = split_into_chunks([message.id, ...message_data_bytes], 15).map((fragment_bytes, index, chunks) =>
			(new Message_Fragment([(chunks.length - 1 - index + ((index === 0) ? 128 : 0)), ...pad_array_end(fragment_bytes, 15, 0)]))
		);
		log_communication_debug_message(`Sending message of type ${message.label}, data bytes <${convert_byte_array_to_hex_string(message.data_bytes, ' ')}>, data ${JSON.stringify(message.data)}`);
		await this.send_message_fragments(message_fragments);
	}

	async ensure_peripheral() {
		if (this.peripheral) {
			return this.peripheral;
		}
		const peripheral = await simble.scan_for_peripheral(simble.filter.address(this.address));
		await peripheral.ensure_discovered();
		this.peripheral = peripheral;
		peripheral.set_auto_disconnect_time(this.auto_disconnect_time * 1000);
		peripheral.on('connected', () => {
			this.state = CONNECTION_STATE.CONNECTED;
			this.emit('connected');
		});
		peripheral.on('disconnected', () => {
			this.state = CONNECTION_STATE.DISCONNECTED;
			this.emit('disconnected');
		});
		const communication_service = this.peripheral.get_discovered_service('58e06900-15d8-11e6-b737-0002a5d5c51b');
		this.send_characteristic = communication_service.get_discovered_characteristic('3141dd40-15db-11e6-a24b-0002a5d5c51b');
		this.receive_characteristic = communication_service.get_discovered_characteristic('359d4820-15db-11e6-82bd-0002a5d5c51b');
		await this.receive_characteristic.subscribe((message_fragment_bytes) => {
			this.on_message_fragment_received(new Message_Fragment(message_fragment_bytes));
		});
	}

	async ensure_connected() {
		if (this.state >= CONNECTION_STATE.CONNECTED) {
			return;
		}
		await this.ensure_peripheral();
		await this.peripheral.ensure_discovered();
	}

	async ensure_nonces_exchanged() {
		if (this.state >= CONNECTION_STATE.NONCES_EXCHANGED) {
			return;
		}
		this.local_session_nonce = create_random_byte_array(8);
		await this.send_message(Connection_Request_Message.create({
			user_id: this.user_id,
			local_session_nonce: this.local_session_nonce,
		}));
		await this.await_message('CONNECTION_INFO');
		this.state = CONNECTION_STATE.NONCES_EXCHANGED;
		this.emit('nonces_exchanged');
	}

	async request_status() {
		await this.send_message(Status_Request_Message.create({
			date: (new Date()),
		}));
		await this.await_event('status_update');
	}

	async ensure_disconnected() {
		if (this.state < CONNECTION_STATE.CONNECTED) {
			return;
		}
		await this.send_message(Close_Connection_Message.create());
		await this.peripheral.disconnect();
	}

	async disconnect() {
		await this.ensure_disconnected();
	}

}

/**
 * The regular expression pattern of the data encoded in the QR-Code on the "Key Card"s of the eQ-3 eqiva Bluetooth smart locks.
 * @constant
 * @type {string}
 */
const KEY_CARD_DATA_PATTERN = '^M(?<address>[0-9A-F]{12})K(?<key>[0-9A-F]{32})(?<serial>[0-9A-Z]{10})$';

/**
 * The regular expression of the data encoded in the QR-Code on the "Key Card"s of the eQ-3 eqiva Bluetooth smart locks.
 * @constant
 * @type {RegExp}
 */
const KEY_CARD_DATA_REGEXP = (new RegExp(KEY_CARD_DATA_PATTERN));

//- _REQUIRE_ES_ 'library/create_byte_array_formats.js'
//- _REQUIRE_ES_ 'library/convert_hex_string_to_byte_array.js'
/**
 * Parse the data of a "Key Card".
 * @param {string} key_card_data_string - The data string encoded in the QR-Code on the Key Card.
 * @returns {object} The information encoded on the Key Card, as an object with "address", "key" and "serial" properties.
 * @throws {Error} If the specified key card data string is invalid.
 */
const parse_key_card_data = (key_card_data_string) => {
	const match = key_card_data_string.trim().match(KEY_CARD_DATA_REGEXP);
	if (! match) {
		throw (new Error(`"${key_card_data_string}" is not a valid Key Card data string`));
	}
	return {
		address: create_byte_array_formats(hex_string_to_byte_array(match.groups.address), ':').long,
		key: create_byte_array_formats(hex_string_to_byte_array(match.groups.key), ' ').short,
		serial: match.groups.serial,
	}
}

/**
 * What this module exports.
 */
module.exports = {
	Key_Ble: Key_Ble,
	key_card: {
		parse: parse_key_card_data,
		pattern: KEY_CARD_DATA_PATTERN,
		regexp: KEY_CARD_DATA_REGEXP,
	},
	utils: {
		time_limit: time_limit_promise,
	},
};

