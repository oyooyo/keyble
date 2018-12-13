'use strict'

# Checks if <value> is an array. Returns true if it is an array, false otherwise
is_array = (value) ->
	Array.isArray(value)

arrays_are_equal = (array1, array2) ->
	if (not (is_array(array1) and is_array(array2))) then return false
	if (array1 is array2) then return true
	if (array1.length isnt array2.length) then return false
	for index in [0...array1.length] by 1
		if (array1[index] isnt array2[index]) then return false
	true

# Returns true if the passed argument <value> is neither null nor undefined
is_valid_value = (value) ->
	((value isnt undefined) and (value isnt null))

# Returns the first value in <values...> that is neither null nor undefined
first_valid_value = (values...) ->
	for value in values
		if is_valid_value(value)
			return value
	return

# Converts integer value <integer> into a zero-prefixed hexadecimal string of length <number_of_digits>
integer_to_zero_prefixed_hex_string = (integer, number_of_digits) ->
	('0'.repeat(number_of_digits) + integer.toString(0x10)).slice(-number_of_digits)

# Convert the byte array <byte_array> to a hexadecimal string. Every byte value is converted to a two-digit, zero padded hexadecimal string, prefixed with string <prefix_string> (default:""), suffixed with string <suffix_string> (default:""). All bytes are separated with string <separator_string> (default:" ")
byte_array_to_hex_string = (byte_array, separator_string, prefix_string, suffix_string) ->
	separator_string = first_valid_value(separator_string, ' ')
	prefix_string = first_valid_value(prefix_string, '')
	suffix_string = first_valid_value(suffix_string, '')
	("#{prefix_string}#{integer_to_zero_prefixed_hex_string(byte, 2)}#{suffix_string}" for byte in byte_array).join(separator_string)

byte_array_to_integer = (byte_array, start_offset, end_offset) ->
	start_offset = first_valid_value(start_offset, 0)
	end_offset = first_valid_value(end_offset, byte_array.length)
	temp = 0
	for offset in [start_offset...end_offset] by 1
		if offset < 0
			offset += byte_array.length
		temp = ((temp * 0x100) + byte_array[offset])
	temp

# Returns true if the bit with index <bit_index> is set in <value>, false otherwise
bit_is_set = (value, bit_index) ->
	((value & (1 << bit_index)) isnt 0)

# Creates and returns mixin function (<object>, <mixin_objects...>) -> that mixins all properties for which <key_filter_function>(<key>, <mixin_object>, <object>) returns true into <object>
mixin_factory = (key_filter_function) ->
	(object, mixin_objects...) ->
		for mixin_object in mixin_objects
			if mixin_object
				for key of mixin_object
					if key_filter_function(key, mixin_object, object)
						object[key] = mixin_object[key]
		object

# (<object>, <mixin_objects...>) -> Mixin all own properties of <mixin_objects...> into <object>
mixin_own = mixin_factory (key, mixin_object) ->
	mixin_object.hasOwnProperty(key)

# A prototype object providing the basic features of extendable classes
Extendable =
	extend: (properties) ->
		extended = Object.create(@)
		extended.__super__ = @
		mixin_own(extended, properties)
	create: ->
		instance = Object.create(@)
		instance.__type__ = @
		@initialize.apply(instance, arguments)
		instance
	initialize: ->

# An abstract prototype object for message types
Message = Extendable.extend
	initialize: (data) ->
		if is_array(data)
			@data_bytes = data
		else
			@data_bytes = @encode(data)
		@data = @decode()
		return
	decode: ->
		data = {}
		for key, value_function of @properties
			data[key] = value_function.apply(@)
		data
	encode: -> []
	is_secure: ->
		bit_is_set(@id, 7)
	properties: {}

# Create a new message type with properties <properties>
message_type = (properties) ->
	Message.extend properties

# This class represents "CLOSE_CONNECTION" messages; messages sent to the Smart Lock in order to close the connection
# Java class "de.eq3.ble.key.android.a.a.o" in original app
Close_Connection_Message = message_type
	id: 0x06
	label: 'CLOSE_CONNECTION'

# This class represents "COMMAND" messages; messages sent to the Smart Lock requesting to perform one of the three commands/actions (0=Lock, 1=Unlock, 2=Open)
# Java class "de.eq3.ble.key.android.a.a.p" in original app
Command_Message = message_type
	id: 0x87
	label: 'COMMAND'
	encode: (data) ->
		[data.command_id]

# Returns a new array obtained by concatenating all arrays passed as arguments
concatenated_array = ->
	Array.prototype.concat.apply([], arguments)

# Convert a Buffer instance <buffer> to an array of byte integers
buffer_to_byte_array = (buffer) ->
	[buffer...]

# AES-128-encrypt <data> (a byte array) with <key> (a byte array), in ECB mode, and return the encrypted data as a byte array
encrypt_aes_ecb = (data, key) ->
	aesjs = require('aes-js')
	cipher = new aesjs.ModeOfOperation.ecb(key)
	buffer_to_byte_array(cipher.encrypt(data))

# Returns the smallest value equal or larger than <value> that equals (<minimum> + (x * <step>)) for a natural number x
generic_ceil = (value, step, minimum) ->
	step = first_valid_value(step, 1)
	minimum = first_valid_value(minimum, 0)
	((Math.ceil((value - minimum) / step) * step) + minimum)

# Extract the byte with index <byte_index> from the multi-byte integer value <integer>. 0 is the lowest/least significant byte index
extract_byte = (integer, byte_index) ->
	((integer >> (byte_index * 8)) & 0xFF)

# Convert the integer value <integer> to a low-endian byte array of length <number_of_bytes>
integer_to_byte_array = (integer, number_of_bytes) ->
	(extract_byte(integer, byte_index) for byte_index in [(number_of_bytes - 1)..0] by -1)

# Returns a function with argument <value> that returns true if <value> is of type <type_string>, false otherwise
is_of_type = (type_string) ->
	(value) ->
		(typeof(value) is type_string)

# Returns true if the passed argument <value> is of type "function", false otherwise
is_function = is_of_type('function')

# Create a new array of length <length>, filled with <element>. If <element> is a function, it will be called with the index of the element to be created as argument, and must return the element at this index
create_array_of_length = (length, element) ->
	create_element = (if is_function(element) then element else (-> element))
	(create_element(index) for index in [0...length] by 1)

# Returns a new array by padding array <array> with as many <pad_element> elements until it has length <length>
padded_array = (array, length, pad_element) ->
	concatenated_array(array, create_array_of_length(Math.max((length - array.length), 0), pad_element))

# XOR the byte array <byte_array> with <xor_byte_array>. Returns a new byte array with the same length as <byte_array>. The first byte in <byte_array> will be XORed with the byte at index <xor_byte_array_offset> in <xor_byte_array> (default: 0), if the end of <xor_byte_array> is reached, it will begin at the start of <byte_array> again
xor_array = (byte_array, xor_byte_array, xor_byte_array_offset) ->
	xor_byte_array_offset = first_valid_value(xor_byte_array_offset, 0)
	((byte ^ xor_byte_array[(xor_byte_array_offset + index) % xor_byte_array.length]) for byte, index in byte_array)

# Compute the authentication value for <data> (a byte array) with message type ID <message_type_id> (an integer), session-open-nonce <session_open_nonce> (a byte array), security_counter <security_counter> (an integer) and AES-128-key <key> (a byte array)
compute_authentication_value = (data, message_type_id, session_open_nonce, security_counter, key) ->
	nonce = compute_nonce(message_type_id, session_open_nonce, security_counter)
	data_length = data.length
	padded_data_length = generic_ceil(data_length, 16, 0)
	padded_data = padded_array(data, padded_data_length, 0)
	encrypted_xor_data = encrypt_aes_ecb(
		concatenated_array(
			[9],
			nonce,
			integer_to_byte_array(data_length, 2),
		),
		key,
	)
	for padded_data_offset in [0...padded_data_length] by 0x10
		encrypted_xor_data = encrypt_aes_ecb(
			xor_array(
				encrypted_xor_data,
				padded_data,
				padded_data_offset,
			),
			key,
		)
	xor_array(
		encrypted_xor_data.slice(0, 4),
		encrypt_aes_ecb(
			concatenated_array(
				[1],
				nonce,
				[0, 0],
			),
			key,
		),
	)

# This class represents "CONNECTION_INFO" messages; messages with informations like the remote session nonce etc.. Sent by the Smart Lock in response to CONNECTION_REQUEST messages
# Java class "de.eq3.ble.key.android.a.a.q" in original app
Connection_Info_Message = message_type
	id: 0x03
	label: 'CONNECTION_INFO'
	properties:
		user_id: -> @data_bytes[0]
		remote_session_nonce: -> @data_bytes.slice(1, 9)
		bootloader_version: -> @data_bytes[10]
		application_version: -> @data_bytes[11]

# This class represents "CONNECTION_REQUEST" messages; messages sent to the Smart Lock in order to set up a secure connection
# Java class "de.eq3.ble.key.android.a.a.r" in original app
Connection_Request_Message = message_type
	id: 0x02
	label: 'CONNECTION_REQUEST'
	encode: (data) ->
		concatenated_array(
			[data.user_id],
			data.local_session_nonce,
		)

# This class represents "STATUS_CHANGED_NOTIFICATION" messages
# Java class "de.eq3.ble.key.android.a.a.ae" in original app
Status_Changed_Notification_Message = message_type
	id: 0x05
	label: 'STATUS_CHANGED_NOTIFICATION'

# This class represents "STATUS_INFO" messages
# Java class "de.eq3.ble.key.android.a.a.af" in original app
Status_Info_Message = message_type
	id: 0x83
	label: 'STATUS_INFO'
	properties:
		a: -> bit_is_set(@data_bytes[0], 6)
		user_right_type: -> ((@data_bytes[0] & 0x30) >> 4)
		e: -> bit_is_set(@data_bytes[1], 7)
		f: -> bit_is_set(@data_bytes[1], 4)
		g: -> bit_is_set(@data_bytes[1], 0)
		h: -> bit_is_set(@data_bytes[2], 5)
		i: -> bit_is_set(@data_bytes[2], 4)
		j: -> bit_is_set(@data_bytes[2], 3)
		lock_status: -> (@data_bytes[2] & 0x07)
		l: -> @data_bytes[4]
		m: -> @data_bytes[5]

# Canonicalize hexadecimal string <hex_string> by removing all non-hexadecimal characters, and converting all hex digits to lower case
canonicalize_hex_string = (hex_string) ->
	hex_string.replace(/[^0-9A-Fa-f]/g, '').toLowerCase()

# Returns an array with chunks/slices of <slicable>. Each chunk/slice has the same length <chunk_length> (except for the last chunk/slice, which may have a smaller length)
split_into_chunks = (slicable, chunk_length) ->
	(slicable.slice(index, (index + chunk_length)) for index in [0...slicable.length] by chunk_length)

# Convert the hexadecimal string <hex_string> to a byte array
hex_string_to_byte_array = (hex_string) ->
	(parseInt(byte_hex_string, 0x10) for byte_hex_string in split_into_chunks(canonicalize_hex_string(hex_string), 2))

# Returns true if the passed argument <value> is a Buffer instance, false otherwise
is_buffer = (value) ->
	Buffer.isBuffer(value)

# Returns true if the passed argument <value> is a string, false otherwise
is_string = is_of_type('string')

# Convert <value>, which may either be a byte array, a hexadecimal string or a Buffer instance, to a byte array. If <value> is neither of those, null is returned
convert_to_byte_array = (value) ->
	if is_array(value)
		return value
	if is_string(value)
		return hex_string_to_byte_array(value)
	if is_buffer(value)
		return buffer_to_byte_array(value)
	return null

# Returns a random integer value, in the range from <minimum_value> (inclusive, default:0) to <maximum_value_exclusive> (exclusive)
create_random_integer = (maximum_value, minimum_value) ->
	minimum_value = first_valid_value(minimum_value, 0)
	(Math.floor(Math.random() * (maximum_value - minimum_value)) + minimum_value)

# Returns a single random integer in the byte range
create_random_byte = ->
	create_random_integer(0x100)

# Create a new array of length <length>, filled with random byte values
create_random_byte_array = (length) ->
	create_array_of_length(length, create_random_byte)

# Compute the "nonce" for a message with type ID <message_type_id>, session-open-nonce <session_open_nonce>, and security counter <security_counter>
compute_nonce = (message_type_id, session_open_nonce, security_counter) ->
	concatenated_array(
		[message_type_id],
		session_open_nonce,
		[0, 0],
		integer_to_byte_array(security_counter, 2),
	)

# Encrypt/Decrypt <data> (a byte array) with message type ID <message_type_id> (an integer), session-open-nonce <session_open_nonce> (a byte array), security_counter <security_counter> (an integer) and AES-128-key <key> (a byte array). If <data> is decrypted, it will be encrypted; if it is encrypted, it will be decrypted
crypt_data = (data, message_type_id, session_open_nonce, security_counter, key) ->
	nonce = compute_nonce(message_type_id, session_open_nonce, security_counter)
	xor_data = []
	for index in [0...(generic_ceil(data.length, 16, 0) // 0x10)] by 1
		xor_data = concatenated_array(
			xor_data,
			encrypt_aes_ecb(
				concatenated_array(
					[1],
					nonce,
					integer_to_byte_array((index + 1), 2),
				),
				key,
			),
		)
	xor_array(
		data,
		xor_data,
	)

# Debug output function for keyble Bluetooth communication
debug_communication = require('debug')('keyble:communication')

# Debug output function for keyble events
debug_events = require('debug')('keyble:events')

# Import/Require the "events" module = the EventEmitter class
Event_Emitter = require('events')

# This class represents "FRAGMENT_ACK" messages; messages that acknowledge the receival of a fragment of a message (except for the last one)
# Java class "de.eq3.ble.key.android.a.a.t" in original app
Fragment_Ack_Message = message_type
	id: 0x00
	label: 'FRAGMENT_ACK'
	encode: (data) ->
		[data.fragment_id]

# This class represents a message fragment. Bluetooth characteristics can only transfer a very limited number of bytes at once, so larger messages need to be split into several fragments/parts
Message_Fragment = Extendable.extend
	initialize: (@byte_array) ->
	get_status_byte: ->
		@byte_array[0]
	get_number_of_remaining_fragments: ->
		(@get_status_byte() & 0x7F)
	get_message_type_id: ->
		if not @is_first()
			throw new Error('Is not first fragment')
		@byte_array[1]
	is_first: ->
		bit_is_set(@get_status_byte(), 7)
	is_last: ->
		(@get_number_of_remaining_fragments() is 0)
	is_complete_message: ->
		(@is_first() and @is_last())
	get_data_byte_array: ->
		@byte_array.slice(if @is_first() then 2 else 1)

# Convert an array of objects <objects_array> to an object of objects, where each property key/name is the value of property <property_name> of the object, and the property value is the object itself
dictify_array = (objects_array, property_name) ->
	temp = {}
	for object in objects_array
		temp[object[property_name]] = object
	temp

# This class represents "ANSWER_WITH_SECURITY" messages
# Java class "de.eq3.ble.key.android.a.a.e" in original app
Answer_With_Security_Message = message_type
	id: 0x81
	label: 'ANSWER_WITH_SECURITY'
	properties:
		a: -> ((@data_bytes[0] & 0x80) is 0)
		b: -> ((@data_bytes[0] & 0x81) is 1)

# This class represents "ANSWER_WITHOUT_SECURITY" messages
# Java class "de.eq3.ble.key.android.a.a.f" in original app
Answer_Without_Security_Message = message_type
	id: 0x01
	label: 'ANSWER_WITHOUT_SECURITY'

# This class represents "PAIRING_REQUEST" messages
# Java class "de.eq3.ble.key.android.a.a.ac" in original app
Pairing_Request_Message = message_type
	id: 0x04
	label: 'PAIRING_REQUEST'
	encode: (data) ->
		concatenated_array(
			[data.user_id],
			padded_array(data.encrypted_pair_key, 22, 0),
			integer_to_byte_array(data.security_counter, 2),
			data.authentication_value,
		)

# This class represents "STATUS_REQUEST" messages; messages sent to the Smart Lock, informing the current date/time, and requesting status information
# Java class "de.eq3.ble.key.android.a.a.ag" in original app
Status_Request_Message = message_type
	id: 0x82
	label: 'STATUS_REQUEST'
	encode: (data) ->
		date = new Date()
		[
			(date.getFullYear() - 2000)
			(date.getMonth() + 1)
			date.getDate()
			date.getHours()
			date.getMinutes()
			date.getSeconds()
		]

# This class represents "USER_INFO" messages
# Java class "de.eq3.ble.key.android.a.a.ah" in original app
User_Info_Message = message_type
	id: 0x8f
	label: 'USER_INFO'

# Convert string <string> to a UTF-8 byte array
string_to_utf8_byte_array = (string) ->
	buffer_to_byte_array(Buffer.from(string, 'utf8'))

# This class represents "USER_NAME_SET" messages; messages sent to the Smart Lock requesting to change a user name
# Java class "de.eq3.ble.key.android.a.a.al" in original app
User_Name_Set_Message = message_type
	id: 0x90
	label: 'USER_NAME_SET'
	encode: (data) ->
		concatenated_array(
			[data.user_id],
			padded_array(string_to_utf8_byte_array(data.user_name), 20, 0),
		)

# An array of all (currently implemented) message types
message_types = [
	Fragment_Ack_Message
	Answer_Without_Security_Message
	Connection_Request_Message
	Connection_Info_Message
	Pairing_Request_Message
	Status_Changed_Notification_Message
	Close_Connection_Message
	Answer_With_Security_Message
	Status_Request_Message
	Status_Info_Message
	Command_Message
	User_Info_Message
	User_Name_Set_Message
]

# An object that has the various message types as properties, and the labels of these message types as property names/keys
message_types_by_id = dictify_array(message_types, 'id')

# Import/Require the "simble" module for communicating with Bluetooth Low Energy peripherals
simble = require('simble')

# An object with the possible Key_Ble states
state = 
	disconnected: 0
	connected: 1
	nonces_exchanged: 2
	secured: 3

# A class that represents the eQ-3 eqiva Bluetooth smart lock
Key_Ble = class extends Event_Emitter

	constructor: (options) ->
		super()
		@address = simble.canonicalize.address(options.address)
		@user_id = first_valid_value(options.user_id, 0xFF)
		@user_key = convert_to_byte_array(options.user_key)
		@auto_disconnect_time = first_valid_value(options.auto_disconnect_time, 15.0)
		@set_status_update_time(options.status_update_time)
		@received_message_fragments = []
		@local_security_counter = 1
		@remote_security_counter = 0
		@state = state.disconnected
		@lock_status_id = null
		return

	set_status_update_time: (status_update_time) ->
		@status_update_time = first_valid_value(status_update_time, 600.0)
		@set_status_update_timer()
		return

	# Await up to <timeout> (default: 1000) milliseconds for the event with ID <event_id> (a string). If <timeout> is 0, wait forever. Returns a Promise that resolves when the event occurs, and rejects if a timeout situation occurs
	await_event: (event_id) ->
		new Promise (resolve, reject) =>
			@once event_id, (args...) ->
				resolve(args)
				return
			return

	await_message: (message_type) ->
		@await_event("received:message:#{message_type}")

	set_user_name: (user_name, user_id) ->
		user_id = first_valid_value(user_id, @user_id)
		@send_message User_Name_Set_Message.create
			user_id: user_id
			user_name: user_name
		.then =>
			@await_message('USER_INFO')

	pairing_request: (card_key) ->
		card_key = convert_to_byte_array(card_key)
		@user_key = create_random_byte_array(16)
		@ensure_nonces_exchanged()
		.then =>
			@send_message Pairing_Request_Message.create
				user_id: @user_id
				encrypted_pair_key: crypt_data(
					@user_key,
					Pairing_Request_Message.id,
					@remote_session_nonce,
					@local_security_counter,
					card_key
				)
				security_counter: @local_security_counter
				authentication_value: compute_authentication_value(
					padded_array(concatenated_array([@user_id], @user_key), 23, 0),
					Pairing_Request_Message.id,
					@remote_session_nonce,
					@local_security_counter,
					card_key
				)
		.then =>
			@await_message('ANSWER_WITH_SECURITY')
		.then =>
			user_id: @user_id
			user_key: byte_array_to_hex_string(@user_key, '')

	emit: (event_id) ->
		debug_events "Event: #{event_id}"
		super arguments...

	# Lock the smart lock
	lock: ->
		if (@lock_status_id is 3) then return Promise.resolve()
		@send_command(0)
		.then =>
			@await_event 'status:LOCKED'

	# Unlock the smart lock
	unlock: ->
		if (@lock_status_id is 2) then return Promise.resolve()
		@send_command(1)
		.then =>
			@await_event 'status:UNLOCKED'

	# Open the smart lock
	open: ->
		if (@lock_status_id is 4) then return Promise.resolve()
		@send_command(2)
		.then =>
			@await_event 'status:OPENED'

	# Send a COMMAND message with command/action ID <command_id> (0 = lock, 1 = unlock, 2 = open)
	send_command: (command_id) ->
		@send_message Command_Message.create
			command_id: command_id

	on_message_fragment_received: (message_fragment) ->
		@received_message_fragments.push(message_fragment)
		@emit 'received:fragment', message_fragment
		if message_fragment.is_last()
			message_data_bytes = @received_message_fragments.reduce (byte_array, message_fragment) ->
					concatenated_array(byte_array, message_fragment.get_data_byte_array())
				, []
			Message_Type = message_types_by_id[@received_message_fragments[0].get_message_type_id()]
			if Message_Type.is_secure()
				message_security_counter = byte_array_to_integer(message_data_bytes, -6, -4)
				if (message_security_counter <= @remote_security_counter) then throw new Error('Received message contains invalid security counter')
				message_authentication_value = message_data_bytes.slice(-4)
				@remote_security_counter = message_security_counter
				message_data_bytes = crypt_data(message_data_bytes.slice(0, -6), Message_Type.id, @local_session_nonce, @remote_security_counter, @user_key)
				computed_authentication_value = compute_authentication_value(message_data_bytes, Message_Type.id, @local_session_nonce, @remote_security_counter, @user_key)
				if (not arrays_are_equal(message_authentication_value, computed_authentication_value)) then throw new Error('Received message contains invalid authentication value')
			@received_message_fragments = []
			@on_message_received(Message_Type.create(message_data_bytes))
		else
			@send_message Fragment_Ack_Message.create
				fragment_id: message_fragment.get_status_byte()
		return

	set_status_update_timer: ->
		clearTimeout(@status_update_timer)
		if (@status_update_time > 0)
			@status_update_timer = setTimeout =>
					@request_status()
					return
				, (@status_update_time * 1000)

	on_message_received: (message) ->
		@emit 'received:message', message
		@emit "received:message:#{message.label}", message
		debug_communication "Received message of type #{message.label}, data bytes <#{byte_array_to_hex_string(message.data_bytes, ' ')}>, data #{JSON.stringify(message.data)}"
		switch message.__type__
			when Connection_Info_Message
				@user_id = message.data.user_id
				@remote_session_nonce = message.data.remote_session_nonce
				@local_security_counter = 1
				@remote_security_counter = 0
			when Status_Info_Message
				lock_status_id = message.data.lock_status
				lock_status_string = {
					0:'UNKNOWN',
					1:'MOVING',
					2:'UNLOCKED',
					3:'LOCKED',
					4:'OPENED',
				}[lock_status_id]
				@emit 'status_update', lock_status_id, lock_status_string
				if (@lock_status_id isnt lock_status_id)
					@lock_status_id = lock_status_id
					@emit "status:#{lock_status_string}", lock_status_id, lock_status_string
					@emit 'status_change', lock_status_id, lock_status_string
				@set_status_update_timer()
			when Status_Changed_Notification_Message
				@request_status()
		return

	send_message_fragment: (message_fragment) ->
		@ensure_connected()
		.then =>
			send_promise = @send_characteristic.write(message_fragment.byte_array)
			ack_promise = (if (not message_fragment.is_last()) then @await_message('FRAGMENT_ACK') else Promise.resolve())
			Promise.all([send_promise, ack_promise])

	send_message_fragments: (message_fragments) ->
		send_message_fragment_with_index = (message_fragment_index) =>
			if message_fragment_index < message_fragments.length
				message_fragment = message_fragments[message_fragment_index]
				@send_message_fragment(message_fragment)
				.then ->
					send_message_fragment_with_index(message_fragment_index + 1)
			else
				Promise.resolve()
		send_message_fragment_with_index(0)

	send_message: (message) ->
		(if message.is_secure() then @ensure_nonces_exchanged() else @ensure_connected())
		.then =>
			debug_communication "Sending message of type #{message.label}, data bytes <#{byte_array_to_hex_string(message.data_bytes, ' ')}>, data #{JSON.stringify(message.data)}"
			if message.is_secure()
				padded_data = padded_array(message.data_bytes, generic_ceil(message.data_bytes.length, 15, 8), 0)
				crypt_data(padded_data, message.id, @remote_session_nonce, @local_security_counter, @user_key)
				message_data_bytes = concatenated_array(
					crypt_data(padded_data, message.id, @remote_session_nonce, @local_security_counter, @user_key),
					integer_to_byte_array(@local_security_counter, 2),
					compute_authentication_value(padded_data, message.id, @remote_session_nonce, @local_security_counter, @user_key),
				)
				@local_security_counter++
			else
				message_data_bytes = message.data_bytes
			message_fragments = split_into_chunks(concatenated_array([message.id], message_data_bytes), 15).map (fragment_bytes, index, chunks) ->
				Message_Fragment.create(concatenated_array([(chunks.length - 1 - index) + (if (index is 0) then 0x80 else 0x00)], padded_array(fragment_bytes, 15, 0)))
			@send_message_fragments(message_fragments)

	ensure_peripheral: ->
		if @peripheral then return Promise.resolve(@peripheral)
		simble.scan_for_peripheral simble.filter.address(@address)
		.then (peripheral) =>
			peripheral.ensure_discovered()
		.then (@peripheral) =>
			@peripheral.set_auto_disconnect_time(@auto_disconnect_time * 1000)
			@peripheral.on 'connected', =>
				@state = state.connected
				@emit 'connected'
				return
			@peripheral.on 'disconnected', =>
				@state = state.disconnected
				@emit 'disconnected'
				return
			communication_service = @peripheral.get_discovered_service('58e06900-15d8-11e6-b737-0002a5d5c51b')
			@send_characteristic = communication_service.get_discovered_characteristic('3141dd40-15db-11e6-a24b-0002a5d5c51b')
			@receive_characteristic = communication_service.get_discovered_characteristic('359d4820-15db-11e6-82bd-0002a5d5c51b')
			@receive_characteristic.subscribe (message_fragment_bytes) =>
				@on_message_fragment_received(Message_Fragment.create(message_fragment_bytes))

	ensure_connected: ->
		@ensure_peripheral()
		.then =>
			return (if (@state >= state.connected) then Promise.resolve() else @peripheral.ensure_discovered())

	ensure_nonces_exchanged: ->
		if (@state >= state.nonces_exchanged) then return Promise.resolve()
		@local_session_nonce = create_random_byte_array(8)
		@send_message Connection_Request_Message.create
			user_id: @user_id
			local_session_nonce: @local_session_nonce
		.then =>
			@await_message 'CONNECTION_INFO'
		.then =>
			@state = state.nonces_exchanged
			@emit 'nonces_exchanged'
			return

	request_status: ->
		@send_message Status_Request_Message.create()
		.then =>
			@await_event 'status_update'

	ensure_disconnected: ->
		if (@state < state.connected) then return Promise.resolve()
		@send_message Close_Connection_Message.create()
		.then =>
			@peripheral.disconnect()

	disconnect: ->
		@ensure_disconnected()

# The pattern of the data encoded in the QR-Code on the "Key Card"s of the eQ-3 eqiva Bluetooth smart locks, as a string
key_card_data_pattern = '^M([0-9A-F]{12})K([0-9A-F]{32})([0-9A-Z]{10})$'

# The pattern of the data encoded in the QR-Code on the "Key Card"s of the eQ-3 eqiva Bluetooth smart locks, as a regular expression/RegExp
key_card_data_regexp = (new RegExp(key_card_data_pattern))

# Convert byte array <byte_array> into several formats/represenations. Returns an array with "buffer" (the byte array as a Buffer instance), "array" (the original byte array), "short" (the byte array as a short hexadecimal string without any non-hexadecimal characters) and "long" (the byte array as a long hexadecimal string, where the bytes are separated by string <long_format_separator> (default: ' ')) properties
byte_array_formats = (byte_array, long_format_separator) ->
	byte_array = convert_to_byte_array(byte_array)
	long_format_separator = first_valid_value(long_format_separator, ' ')
	array: byte_array
	buffer: Buffer.from(byte_array)
	long: byte_array_to_hex_string(byte_array, long_format_separator)
	short: byte_array_to_hex_string(byte_array, '')

# Parse the data string encoded in the QR-Code of the "Key Card"s of the eQ-3 eqiva Bluetooth smart locks. Returns an object with "address", "register_key" and "serial" properties
parse_key_card_data = (key_card_data_string) ->
	match = key_card_data_string.trim().match(key_card_data_regexp)
	if not match then throw new Error('Not a valid Key Card data string')
	address: byte_array_formats(hex_string_to_byte_array(match[1]), ':').long
	register_key: byte_array_formats(hex_string_to_byte_array(match[2]), ' ').short
	serial: match[3]

# Returns a promise that is a time-limited wrapper for promise <promise>. If the promise <promise> does not resolve within <time_limit> milliseconds, the promise is rejected
time_limit_promise = (promise, time_limit, timeout_error_message) ->
	if (time_limit is 0) then return promise
	timeout_error_message = first_valid_value(timeout_error_message, "Promise did not resolve within #{time_limit} milliseconds")
	new Promise (resolve, reject) ->
		timeout = setTimeout ->
				reject(timeout_error_message)
				return
			, time_limit
		Promise.resolve(promise)
		.then (promise_result) ->
			clearTimeout(timeout)
			resolve(promise_result)
			return
		.catch (promise_error) ->
			clearTimeout(timeout)
			reject(promise_error)
			return
		return

# What this module exports
module.exports =
	Key_Ble: Key_Ble
	key_card:
		parse: parse_key_card_data
		pattern: key_card_data_pattern
		regexp: key_card_data_regexp
	utils:
		time_limit: time_limit_promise

