'use strict';
var Answer_With_Security_Message, Answer_Without_Security_Message, Close_Connection_Message, Command_Message, Connection_Info_Message, Connection_Request_Message, Event_Emitter, Extendable, Fragment_Ack_Message, Key_Ble, Message, Message_Fragment, Pairing_Request_Message, Status_Changed_Notification_Message, Status_Info_Message, Status_Request_Message, User_Info_Message, User_Name_Set_Message, bit_is_set, buffer_to_byte_array, byte_array_formats, byte_array_to_hex_string, canonicalize_hex_string, compute_authentication_value, compute_nonce, concatenated_array, convert_to_byte_array, create_array_of_length, create_random_byte, create_random_byte_array, create_random_integer, crypt_data, debug_btle, debug_events, dictify_array, encrypt_aes_ecb, extract_byte, first_valid_value, generic_ceil, hex_string_to_byte_array, integer_to_byte_array, integer_to_zero_prefixed_hex_string, is_array, is_buffer, is_function, is_of_type, is_string, is_valid_value, key_card_data_pattern, key_card_data_regexp, message_type, message_types, message_types_by_id, mixin_factory, mixin_own, padded_array, parse_key_card_data, simble, split_into_chunks, state, string_to_utf8_byte_array, xor_array;

// Returns true if the passed argument <value> is neither null nor undefined
is_valid_value = function(value) {
  return (value !== void 0) && (value !== null);
};

// Returns the first value in <values...> that is neither null nor undefined
first_valid_value = function(...values) {
  var i, len, value;
  for (i = 0, len = values.length; i < len; i++) {
    value = values[i];
    if (is_valid_value(value)) {
      return value;
    }
  }
};

// Converts integer value <integer> into a zero-prefixed hexadecimal string of length <number_of_digits>
integer_to_zero_prefixed_hex_string = function(integer, number_of_digits) {
  return ('0'.repeat(number_of_digits) + integer.toString(0x10)).slice(-number_of_digits);
};

// Convert the byte array <byte_array> to a hexadecimal string. Every byte value is converted to a two-digit, zero padded hexadecimal string, prefixed with string <prefix_string> (default:""), suffixed with string <suffix_string> (default:""). All bytes are separated with string <separator_string> (default:" ")
byte_array_to_hex_string = function(byte_array, separator_string, prefix_string, suffix_string) {
  var byte;
  separator_string = first_valid_value(separator_string, ' ');
  prefix_string = first_valid_value(prefix_string, '');
  suffix_string = first_valid_value(suffix_string, '');
  return ((function() {
    var i, len, results;
    results = [];
    for (i = 0, len = byte_array.length; i < len; i++) {
      byte = byte_array[i];
      results.push(`${prefix_string}${integer_to_zero_prefixed_hex_string(byte, 2)}${suffix_string}`);
    }
    return results;
  })()).join(separator_string);
};

// Returns true if the bit with index <bit_index> is set in <value>, false otherwise
bit_is_set = function(value, bit_index) {
  return (value & (1 << bit_index)) !== 0;
};

// Creates and returns mixin function (<object>, <mixin_objects...>) -> that mixins all properties for which <key_filter_function>(<key>, <mixin_object>, <object>) returns true into <object>
mixin_factory = function(key_filter_function) {
  return function(object, ...mixin_objects) {
    var i, key, len, mixin_object;
    for (i = 0, len = mixin_objects.length; i < len; i++) {
      mixin_object = mixin_objects[i];
      if (mixin_object) {
        for (key in mixin_object) {
          if (key_filter_function(key, mixin_object, object)) {
            object[key] = mixin_object[key];
          }
        }
      }
    }
    return object;
  };
};

// (<object>, <mixin_objects...>) -> Mixin all own properties of <mixin_objects...> into <object>
mixin_own = mixin_factory(function(key, mixin_object) {
  return mixin_object.hasOwnProperty(key);
});

// A prototype object providing the basic features of extendable classes
Extendable = {
  extend: function(properties) {
    var extended;
    extended = Object.create(this);
    extended.__super__ = this;
    return mixin_own(extended, properties);
  },
  create: function() {
    var instance;
    instance = Object.create(this);
    instance.__type__ = this;
    this.initialize.apply(instance, arguments);
    return instance;
  },
  initialize: function() {}
};

// Checks if <value> is an array. Returns true if it is an array, false otherwise
is_array = function(value) {
  return Array.isArray(value);
};

// An abstract prototype object for message types
Message = Extendable.extend({
  initialize: function(data) {
    if (is_array(data)) {
      this.data_bytes = data;
    } else {
      this.data_bytes = this.encode(data);
    }
    this.data = this.decode();
  },
  decode: function() {
    var data, key, ref, value_function;
    data = {};
    ref = this.properties;
    for (key in ref) {
      value_function = ref[key];
      data[key] = value_function.apply(this);
    }
    return data;
  },
  encode: function() {
    return [];
  },
  is_secure: function() {
    return bit_is_set(this.id, 7);
  },
  properties: {}
});

// Create a new message type with properties <properties>
message_type = function(properties) {
  return Message.extend(properties);
};

// This class represents "CLOSE_CONNECTION" messages; messages sent to the Smart Lock in order to close the connection
// Java class "de.eq3.ble.key.android.a.a.o" in original app
Close_Connection_Message = message_type({
  id: 0x06,
  label: 'CLOSE_CONNECTION'
});

// This class represents "COMMAND" messages; messages sent to the Smart Lock requesting to perform one of the three commands/actions (0=Lock, 1=Unlock, 2=Open)
// Java class "de.eq3.ble.key.android.a.a.p" in original app
Command_Message = message_type({
  id: 0x87,
  label: 'COMMAND',
  encode: function(data) {
    return [data.command_id];
  }
});

// Returns a new array obtained by concatenating all arrays passed as arguments
concatenated_array = function() {
  return Array.prototype.concat.apply([], arguments);
};

// Convert a Buffer instance <buffer> to an array of byte integers
buffer_to_byte_array = function(buffer) {
  return [...buffer];
};

// AES-128-encrypt <data> (a byte array) with <key> (a byte array), in ECB mode, and return the encrypted data as a byte array
encrypt_aes_ecb = function(data, key) {
  var aesjs, cipher;
  aesjs = require('aes-js');
  cipher = new aesjs.ModeOfOperation.ecb(key);
  return buffer_to_byte_array(cipher.encrypt(data));
};

// Returns the smallest value equal or larger than <value> that equals (<minimum> + (x * <step>)) for a natural number x
generic_ceil = function(value, step, minimum) {
  step = first_valid_value(step, 1);
  minimum = first_valid_value(minimum, 0);
  return (Math.ceil((value - minimum) / step) * step) + minimum;
};

// Extract the byte with index <byte_index> from the multi-byte integer value <integer>. 0 is the lowest/least significant byte index
extract_byte = function(integer, byte_index) {
  return (integer >> (byte_index * 8)) & 0xFF;
};

// Convert the integer value <integer> to a low-endian byte array of length <number_of_bytes>
integer_to_byte_array = function(integer, number_of_bytes) {
  var byte_index, i, ref, results;
  results = [];
  for (byte_index = i = ref = number_of_bytes - 1; i >= 0; byte_index = i += -1) {
    results.push(extract_byte(integer, byte_index));
  }
  return results;
};

// Returns a function with argument <value> that returns true if <value> is of type <type_string>, false otherwise
is_of_type = function(type_string) {
  return function(value) {
    return typeof value === type_string;
  };
};

// Returns true if the passed argument <value> is of type "function", false otherwise
is_function = is_of_type('function');

// Create a new array of length <length>, filled with <element>. If <element> is a function, it will be called with the index of the element to be created as argument, and must return the element at this index
create_array_of_length = function(length, element) {
  var create_element, i, index, ref, results;
  create_element = (is_function(element) ? element : (function() {
    return element;
  }));
  results = [];
  for (index = i = 0, ref = length; i < ref; index = i += 1) {
    results.push(create_element(index));
  }
  return results;
};

// Returns a new array by padding array <array> with as many <pad_element> elements until it has length <length>
padded_array = function(array, length, pad_element) {
  return concatenated_array(array, create_array_of_length(Math.max(length - array.length, 0), pad_element));
};

// XOR the byte array <byte_array> with <xor_byte_array>. Returns a new byte array with the same length as <byte_array>. The first byte in <byte_array> will be XORed with the byte at index <xor_byte_array_offset> in <xor_byte_array> (default: 0), if the end of <xor_byte_array> is reached, it will begin at the start of <byte_array> again
xor_array = function(byte_array, xor_byte_array, xor_byte_array_offset) {
  var byte, i, index, len, results;
  xor_byte_array_offset = first_valid_value(xor_byte_array_offset, 0);
  results = [];
  for (index = i = 0, len = byte_array.length; i < len; index = ++i) {
    byte = byte_array[index];
    results.push(byte ^ xor_byte_array[(xor_byte_array_offset + index) % xor_byte_array.length]);
  }
  return results;
};

// Compute the authentication value for <data> (a byte array) with message type ID <message_type_id> (an integer), session-open-nonce <session_open_nonce> (a byte array), security_counter <security_counter> (an integer) and AES-128-key <key> (a byte array)
compute_authentication_value = function(data, message_type_id, session_open_nonce, security_counter, key) {
  var data_length, encrypted_xor_data, i, nonce, padded_data, padded_data_length, padded_data_offset, ref;
  nonce = compute_nonce(message_type_id, session_open_nonce, security_counter);
  data_length = data.length;
  padded_data_length = generic_ceil(data_length, 16, 0);
  padded_data = padded_array(data, padded_data_length, 0);
  encrypted_xor_data = encrypt_aes_ecb(concatenated_array([9], nonce, integer_to_byte_array(data_length, 2)), key);
  for (padded_data_offset = i = 0, ref = padded_data_length; i < ref; padded_data_offset = i += 0x10) {
    encrypted_xor_data = encrypt_aes_ecb(xor_array(encrypted_xor_data, padded_data, padded_data_offset), key);
  }
  return xor_array(encrypted_xor_data.slice(0, 4), encrypt_aes_ecb(concatenated_array([1], nonce, [0, 0]), key));
};

// This class represents "CONNECTION_INFO" messages; messages with informations like the remote session nonce etc.. Sent by the Smart Lock in response to CONNECTION_REQUEST messages
// Java class "de.eq3.ble.key.android.a.a.q" in original app
Connection_Info_Message = message_type({
  id: 0x03,
  label: 'CONNECTION_INFO',
  properties: {
    user_id: function() {
      return this.data_bytes[0];
    },
    remote_session_nonce: function() {
      return this.data_bytes.slice(1, 9);
    },
    bootloader_version: function() {
      return this.data_bytes[10];
    },
    application_version: function() {
      return this.data_bytes[11];
    }
  }
});

// This class represents "CONNECTION_REQUEST" messages; messages sent to the Smart Lock in order to set up a secure connection
// Java class "de.eq3.ble.key.android.a.a.r" in original app
Connection_Request_Message = message_type({
  id: 0x02,
  label: 'CONNECTION_REQUEST',
  encode: function(data) {
    return concatenated_array([data.user_id], data.local_session_nonce);
  }
});

// Canonicalize hexadecimal string <hex_string> by removing all non-hexadecimal characters, and converting all hex digits to lower case
canonicalize_hex_string = function(hex_string) {
  return hex_string.replace(/[^0-9A-Fa-f]/g, '').toLowerCase();
};

// Returns an array with chunks/slices of <slicable>. Each chunk/slice has the same length <chunk_length> (except for the last chunk/slice, which may have a smaller length)
split_into_chunks = function(slicable, chunk_length) {
  var i, index, ref, ref1, results;
  results = [];
  for (index = i = 0, ref = slicable.length, ref1 = chunk_length; ref1 !== 0 && (ref1 > 0 ? i < ref : i > ref); index = i += ref1) {
    results.push(slicable.slice(index, index + chunk_length));
  }
  return results;
};

// Convert the hexadecimal string <hex_string> to a byte array
hex_string_to_byte_array = function(hex_string) {
  var byte_hex_string, i, len, ref, results;
  ref = split_into_chunks(canonicalize_hex_string(hex_string), 2);
  results = [];
  for (i = 0, len = ref.length; i < len; i++) {
    byte_hex_string = ref[i];
    results.push(parseInt(byte_hex_string, 0x10));
  }
  return results;
};

// Returns true if the passed argument <value> is a Buffer instance, false otherwise
is_buffer = function(value) {
  return Buffer.isBuffer(value);
};

// Returns true if the passed argument <value> is a string, false otherwise
is_string = is_of_type('string');

// Convert <value>, which may either be a byte array, a hexadecimal string or a Buffer instance, to a byte array. If <value> is neither of those, null is returned
convert_to_byte_array = function(value) {
  if (is_array(value)) {
    return value;
  }
  if (is_string(value)) {
    return hex_string_to_byte_array(value);
  }
  if (is_buffer(value)) {
    return buffer_to_byte_array(value);
  }
  return null;
};

// Returns a random integer value, in the range from <minimum_value> (inclusive, default:0) to <maximum_value_exclusive> (exclusive)
create_random_integer = function(maximum_value, minimum_value) {
  minimum_value = first_valid_value(minimum_value, 0);
  return Math.floor(Math.random() * (maximum_value - minimum_value)) + minimum_value;
};

// Returns a single random integer in the byte range
create_random_byte = function() {
  return create_random_integer(0x100);
};

// Create a new array of length <length>, filled with random byte values
create_random_byte_array = function(length) {
  return create_array_of_length(length, create_random_byte);
};

// Compute the "nonce" for a message with type ID <message_type_id>, session-open-nonce <session_open_nonce>, and security counter <security_counter>
compute_nonce = function(message_type_id, session_open_nonce, security_counter) {
  return concatenated_array([message_type_id], session_open_nonce, [0, 0], integer_to_byte_array(security_counter, 2));
};

// Encrypt/Decrypt <data> (a byte array) with message type ID <message_type_id> (an integer), session-open-nonce <session_open_nonce> (a byte array), security_counter <security_counter> (an integer) and AES-128-key <key> (a byte array). If <data> is decrypted, it will be encrypted; if it is encrypted, it will be decrypted
crypt_data = function(data, message_type_id, session_open_nonce, security_counter, key) {
  var i, index, nonce, ref, xor_data;
  nonce = compute_nonce(message_type_id, session_open_nonce, security_counter);
  xor_data = [];
  for (index = i = 0, ref = Math.floor(generic_ceil(data.length, 16, 0) / 0x10); i < ref; index = i += 1) {
    xor_data = concatenated_array(xor_data, encrypt_aes_ecb(concatenated_array([1], nonce, integer_to_byte_array(index + 1, 2)), key));
  }
  return xor_array(data, xor_data);
};

// Debug output function for keyble Bluetooth communication
debug_btle = require('debug')('keyble:btle');

// Debug output function for keyble events
debug_events = require('debug')('keyble:events');

// Import/Require the "events" module = the EventEmitter class
Event_Emitter = require('events');

// This class represents "FRAGMENT_ACK" messages; messages that acknowledge the receival of a fragment of a message (except for the last one)
// Java class "de.eq3.ble.key.android.a.a.t" in original app
Fragment_Ack_Message = message_type({
  id: 0x00,
  label: 'FRAGMENT_ACK',
  encode: function(data) {
    return [data.fragment_id];
  }
});

// This class represents a message fragment. Bluetooth characteristics can only transfer a very limited number of bytes at once, so larger messages need to be split into several fragments/parts
Message_Fragment = Extendable.extend({
  initialize: function(byte_array1) {
    this.byte_array = byte_array1;
  },
  get_status_byte: function() {
    return this.byte_array[0];
  },
  get_number_of_remaining_fragments: function() {
    return this.get_status_byte() & 0x7F;
  },
  get_message_type_id: function() {
    if (!this.is_first()) {
      throw new Error('Is not first fragment');
    }
    return this.byte_array[1];
  },
  is_first: function() {
    return bit_is_set(this.get_status_byte(), 7);
  },
  is_last: function() {
    return this.get_number_of_remaining_fragments() === 0;
  },
  is_complete_message: function() {
    return this.is_first() && this.is_last();
  },
  get_data_byte_array: function() {
    return this.byte_array.slice(this.is_first() ? 2 : 1);
  }
});

// Convert an array of objects <objects_array> to an object of objects, where each property key/name is the value of property <property_name> of the object, and the property value is the object itself
dictify_array = function(objects_array, property_name) {
  var i, len, object, temp;
  temp = {};
  for (i = 0, len = objects_array.length; i < len; i++) {
    object = objects_array[i];
    temp[object[property_name]] = object;
  }
  return temp;
};

// This class represents "ANSWER_WITH_SECURITY" messages
// Java class "de.eq3.ble.key.android.a.a.e" in original app
Answer_With_Security_Message = message_type({
  id: 0x81,
  label: 'ANSWER_WITH_SECURITY',
  properties: {
    a: function() {
      return (this.data_bytes[0] & 0x80) === 0;
    },
    b: function() {
      return (this.data_bytes[0] & 0x81) === 1;
    }
  }
});

// This class represents "ANSWER_WITHOUT_SECURITY" messages
// Java class "de.eq3.ble.key.android.a.a.f" in original app
Answer_Without_Security_Message = message_type({
  id: 0x01,
  label: 'ANSWER_WITHOUT_SECURITY'
});

// This class represents "PAIRING_REQUEST" messages
// Java class "de.eq3.ble.key.android.a.a.ac" in original app
Pairing_Request_Message = message_type({
  id: 0x04,
  label: 'PAIRING_REQUEST',
  encode: function(data) {
    return concatenated_array([data.user_id], padded_array(data.encrypted_pair_key, 22, 0), integer_to_byte_array(data.security_counter, 2), data.authentication_value);
  }
});

// This class represents "STATUS_CHANGED_NOTIFICATION" messages
// Java class "de.eq3.ble.key.android.a.a.ae" in original app
Status_Changed_Notification_Message = message_type({
  id: 0x05,
  label: 'STATUS_CHANGED_NOTIFICATION'
});

// This class represents "STATUS_INFO" messages
// Java class "de.eq3.ble.key.android.a.a.af" in original app
Status_Info_Message = message_type({
  id: 0x83,
  label: 'STATUS_INFO',
  properties: {
    a: function() {
      return bit_is_set(this.data_bytes[0], 6);
    },
    user_right_type: function() {
      return (this.data_bytes[0] & 0x30) >> 4;
    },
    e: function() {
      return bit_is_set(this.data_bytes[1], 7);
    },
    f: function() {
      return bit_is_set(this.data_bytes[1], 4);
    },
    g: function() {
      return bit_is_set(this.data_bytes[1], 0);
    },
    h: function() {
      return bit_is_set(this.data_bytes[2], 5);
    },
    i: function() {
      return bit_is_set(this.data_bytes[2], 4);
    },
    j: function() {
      return bit_is_set(this.data_bytes[2], 3);
    },
    lock_status: function() {
      return this.data_bytes[2] & 0x07;
    },
    l: function() {
      return this.data_bytes[4];
    },
    m: function() {
      return this.data_bytes[5];
    }
  }
});

// This class represents "STATUS_REQUEST" messages; messages sent to the Smart Lock, informing the current date/time, and requesting status information
// Java class "de.eq3.ble.key.android.a.a.ag" in original app
Status_Request_Message = message_type({
  id: 0x82,
  label: 'STATUS_REQUEST',
  encode: function(data) {
    var date;
    date = new Date();
    return [date.getFullYear() - 2000, date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()];
  }
});

// This class represents "USER_INFO" messages
// Java class "de.eq3.ble.key.android.a.a.ah" in original app
User_Info_Message = message_type({
  id: 0x8f,
  label: 'USER_INFO'
});

// Convert string <string> to a UTF-8 byte array
string_to_utf8_byte_array = function(string) {
  return buffer_to_byte_array(Buffer.from(string, 'utf8'));
};

// This class represents "USER_NAME_SET" messages; messages sent to the Smart Lock requesting to change a user name
// Java class "de.eq3.ble.key.android.a.a.al" in original app
User_Name_Set_Message = message_type({
  id: 0x90,
  label: 'USER_NAME_SET',
  encode: function(data) {
    return concatenated_array([data.user_id], padded_array(string_to_utf8_byte_array(data.user_name), 20, 0));
  }
});

// An array of all (currently implemented) message types
message_types = [Fragment_Ack_Message, Answer_Without_Security_Message, Connection_Request_Message, Connection_Info_Message, Pairing_Request_Message, Status_Changed_Notification_Message, Close_Connection_Message, Answer_With_Security_Message, Status_Request_Message, Status_Info_Message, Command_Message, User_Info_Message, User_Name_Set_Message];

// An object that has the various message types as properties, and the labels of these message types as property names/keys
message_types_by_id = dictify_array(message_types, 'id');

// Import/Require the "simble" module for communicating with Bluetooth Low Energy peripherals
simble = require('simble');

// An object with the possible Key_Ble states
state = {
  disconnected: 0,
  connected: 1,
  nonces_exchanged: 2,
  secured: 3
};

// A class that represents the eqiva eQ-3 Bluetooth smart lock
Key_Ble = class extends Event_Emitter {
  constructor(options) {
    super();
    this.address = simble.canonicalize.address(options.address);
    this.user_id = first_valid_value(options.user_id, 0xFF);
    this.user_key = convert_to_byte_array(options.user_key);
    this.received_message_fragments = [];
    this.local_security_counter = 0;
    this.remote_security_counter = 0;
    this.state = state.disconnected;
    return;
  }

  // Await up to <timeout> (default: 1000) milliseconds for the event with ID <event_id> (a string). If <timeout> is 0, wait forever. Returns a Promise that resolves when the event occurs, and rejects if a timeout situation occurs
  await_event(event_id, timeout) {
    return new Promise((resolve, reject) => {
      var event_handler;
      timeout = first_valid_value(timeout, 1000);
      event_handler = function() {
        resolve(arguments);
      };
      this.once(event_id, event_handler);
      if (timeout > 0) {
        setTimeout(() => {
          this.removeListener(event_id, event_handler);
          reject(new Error(`Timeout waiting for event "${event_id}"`));
        }, timeout);
      }
    });
  }

  await_message(message_type, timeout) {
    return this.await_event(`received:message:${message_type}`, timeout);
  }

  set_user_name(user_name, user_id) {
    user_id = first_valid_value(user_id, this.user_id);
    return this.send_message(User_Name_Set_Message.create({
      user_id: user_id,
      user_name: user_name
    })).then(() => {
      return this.await_message('USER_INFO');
    });
  }

  pairing_request(card_key) {
    card_key = convert_to_byte_array(card_key);
    this.user_key = create_random_byte_array(16);
    return this.ensure_nonces_exchanged().then(() => {
      return this.send_message(Pairing_Request_Message.create({
        user_id: this.user_id,
        encrypted_pair_key: crypt_data(this.user_key, Pairing_Request_Message.id, this.remote_session_nonce, this.local_security_counter, card_key),
        security_counter: this.local_security_counter,
        authentication_value: compute_authentication_value(padded_array(concatenated_array([this.user_id], this.user_key), 23, 0), Pairing_Request_Message.id, this.remote_session_nonce, this.local_security_counter, card_key)
      }));
    }).then(() => {
      return this.await_message('ANSWER_WITH_SECURITY');
    }).then(() => {
      return {
        user_id: this.user_id,
        user_key: byte_array_to_hex_string(this.user_key, '')
      };
    });
  }

  emit(event_id) {
    debug_events(`Event: ${event_id}`);
    return super.emit(...arguments);
  }

  // Lock the smart lock
  lock() {
    return this.send_command(0);
  }

  // Unlock the smart lock
  unlock() {
    return this.send_command(1);
  }

  // Open the smart lock
  open() {
    return this.send_command(2);
  }

  // Send a COMMAND message with command/action ID <command_id> (0 = lock, 1 = unlock, 2 = open)
  send_command(command_id) {
    return this.send_message(Command_Message.create({
      command_id: command_id
    }));
  }

  on_message_fragment_received(message_fragment) {
    var Message_Type, message_data_bytes;
    this.received_message_fragments.push(message_fragment);
    this.emit('received:fragment', message_fragment);
    if (message_fragment.is_last()) {
      message_data_bytes = this.received_message_fragments.reduce(function(byte_array, message_fragment) {
        return concatenated_array(byte_array, message_fragment.get_data_byte_array());
      }, []);
      Message_Type = message_types_by_id[this.received_message_fragments[0].get_message_type_id()];
      if (Message_Type.is_secure()) {
        [message_data_bytes, this.remote_security_counter] = crypt_data(message_data_bytes, Message_Type.id, this.local_session_nonce, this.remote_security_counter, this.user_key);
      }
      this.received_message_fragments = [];
      this.on_message_received(Message_Type.create(message_data_bytes));
    } else {
      this.send_message(Fragment_Ack_Message.create({
        fragment_id: message_fragment.get_status_byte()
      }));
    }
  }

  on_message_received(message) {
    this.emit('received:message', message);
    //debug_btle "Received message #{message.label}: #{byte_array_to_hex_string(message.data)}"
    switch (message.__type__) {
      case Connection_Info_Message:
        this.user_id = message.data.user_id;
        this.remote_session_nonce = message.data.remote_session_nonce;
    }
    this.emit(`received:message:${message.label}`, message);
  }

  send_message_fragment(message_fragment) {
    return this.ensure_connected().then(() => {
      var ack_promise, send_promise;
      debug_btle(`Send:    ${byte_array_to_hex_string(message_fragment.byte_array)}`);
      send_promise = this.send_characteristic.write(message_fragment.byte_array);
      ack_promise = ((!message_fragment.is_last()) ? this.await_message('FRAGMENT_ACK') : Promise.resolve());
      return Promise.all([send_promise, ack_promise]);
    });
  }

  send_message_fragments(message_fragments) {
    var send_message_fragment_with_index;
    send_message_fragment_with_index = (message_fragment_index) => {
      var message_fragment;
      if (message_fragment_index < message_fragments.length) {
        message_fragment = message_fragments[message_fragment_index];
        return this.send_message_fragment(message_fragment).then(function() {
          return send_message_fragment_with_index(message_fragment_index + 1);
        });
      } else {
        return Promise.resolve();
      }
    };
    return send_message_fragment_with_index(0);
  }

  send_message(message) {
    return (message.is_secure() ? this.ensure_nonces_exchanged() : this.ensure_connected()).then(() => {
      var message_data_bytes, message_fragments, padded_data;
      if (message.is_secure()) {
        padded_data = padded_array(message.data_bytes, generic_ceil(message.data_bytes.length, 15, 8), 0);
        crypt_data(padded_data, message.id, this.remote_session_nonce, this.local_security_counter, this.user_key);
        message_data_bytes = concatenated_array(crypt_data(padded_data, message.id, this.remote_session_nonce, this.local_security_counter, this.user_key), integer_to_byte_array(this.local_security_counter, 2), compute_authentication_value(padded_data, message.id, this.remote_session_nonce, this.local_security_counter, this.user_key));
      } else {
        message_data_bytes = message.data_bytes;
      }
      message_fragments = split_into_chunks(concatenated_array([message.id], message_data_bytes), 15).map(function(fragment_bytes, index, chunks) {
        return Message_Fragment.create(concatenated_array([(chunks.length - 1 - index) + (index === 0 ? 0x80 : 0x00)], padded_array(fragment_bytes, 15, 0)));
      });
      this.local_security_counter++;
      return this.send_message_fragments(message_fragments);
    });
  }

  ensure_connected() {
    if (this.state >= state.connected) {
      return Promise.resolve();
    }
    return simble.scan_for_peripheral(simble.filter.address(this.address)).then((peripheral) => {
      this.peripheral = peripheral;
      return this.peripheral.ensure_discovered();
    }).then(() => {
      var communication_service;
      communication_service = this.peripheral.get_discovered_service('58e06900-15d8-11e6-b737-0002a5d5c51b');
      this.send_characteristic = communication_service.get_discovered_characteristic('3141dd40-15db-11e6-a24b-0002a5d5c51b');
      this.receive_characteristic = communication_service.get_discovered_characteristic('359d4820-15db-11e6-82bd-0002a5d5c51b');
      return this.receive_characteristic.subscribe((message_fragment_bytes) => {
        debug_btle(`Receive: ${byte_array_to_hex_string(message_fragment_bytes)}`);
        return this.on_message_fragment_received(Message_Fragment.create(message_fragment_bytes));
      });
    }).then(() => {
      this.peripheral.on('disconnected', () => {
        this.state = state.disconnected;
        return this.emit('disconnected');
      });
      this.state = state.connected;
      this.emit('connected');
    });
  }

  ensure_nonces_exchanged() {
    if (this.state >= state.nonces_exchanged) {
      return Promise.resolve();
    }
    this.local_session_nonce = create_random_byte_array(8);
    return this.send_message(Connection_Request_Message.create({
      user_id: this.user_id,
      local_session_nonce: this.local_session_nonce
    })).then(() => {
      return this.await_message('CONNECTION_INFO');
    });
  }

  request_status() {
    return this.send_message(Status_Request_Message.create()).then(() => {
      return this.await_message('STATUS_INFO');
    });
  }

  disconnect() {
    return this.send_message(Close_Connection_Message.create()).then(() => {
      return this.peripheral.disconnect();
    });
  }

};

// The pattern of the data encoded in the QR-Code on the "Key Card"s of the eqiva eQ-3 Bluetooth smart locks, as a string
key_card_data_pattern = '^M([0-9A-F]{12})K([0-9A-F]{32})([0-9A-Z]{10})$';

// The pattern of the data encoded in the QR-Code on the "Key Card"s of the eqiva eQ-3 Bluetooth smart locks, as a regular expression/RegExp
key_card_data_regexp = new RegExp(key_card_data_pattern);

// Convert byte array <byte_array> into several formats/represenations. Returns an array with "buffer" (the byte array as a Buffer instance), "array" (the original byte array), "short" (the byte array as a short hexadecimal string without any non-hexadecimal characters) and "long" (the byte array as a long hexadecimal string, where the bytes are separated by string <long_format_separator> (default: ' ')) properties
byte_array_formats = function(byte_array, long_format_separator) {
  byte_array = convert_to_byte_array(byte_array);
  long_format_separator = first_valid_value(long_format_separator, ' ');
  return {
    array: byte_array,
    buffer: Buffer.from(byte_array),
    long: byte_array_to_hex_string(byte_array, long_format_separator),
    short: byte_array_to_hex_string(byte_array, '')
  };
};

// Parse the data string encoded in the QR-Code of the "Key Card"s of the eqiva eQ-3 Bluetooth smart locks. Returns an object with "address", "register_key" and "serial" properties
parse_key_card_data = function(key_card_data_string) {
  var match;
  match = key_card_data_string.trim().match(key_card_data_regexp);
  if (!match) {
    throw new Error('Not a valid Key Card data string');
  }
  return {
    address: byte_array_formats(hex_string_to_byte_array(match[1]), ':').long,
    register_key: byte_array_formats(hex_string_to_byte_array(match[2]), ' ').short,
    serial: match[3]
  };
};

// What this module exports
module.exports = {
  Key_Ble: Key_Ble,
  key_card: {
    parse: parse_key_card_data,
    pattern: key_card_data_pattern,
    regexp: key_card_data_regexp
  }
};

//# sourceMappingURL=keyble.js.map
