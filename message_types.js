'use strict';

/**
 * The "message_types" submodule.
 * Contains the available message types etc.
 * @private
 * @module message_types
 */

//- _REQUIRE_ES_ '../library/is_bit_set.js'
/**
 * Import required functions from the 'utils" submodule.
 */
const {
	convert_uint8array_to_integer,
	convert_integer_to_uint8array,
	convert_string_to_utf8_encoded_uint8array,
	convert_utf8_encoded_uint8array_to_string,
	create_lookup_table_by_object_property_value,
	is_bit_set,
	pad_array_end,
	bit_mask_for_value,
} = require('./utils.js');

/**
 * An abstract prototype class for the various message types.
 * The create_message_type function uses this class to create the actual Message type classes.
 */
const Abstract_Message = class {
	static create(data) {
		return (new this(data));
	}
	constructor(data={}) {
		this.data_bytes = ((data instanceof Uint8Array) ? data : this.constructor.encode(data));
		this.data = this.constructor.decode(this.data_bytes);
	}
	static decode(data_bytes) {
		const data = {};
		for (let [key, extract_property_value] of Object.entries(this.properties)) {
			data[key] = extract_property_value(data_bytes);
		}
		return data;
	}
	static properties() {
		return {};
	}
	static encode() {
		return [];
	}
	static is_secure() {
		return is_bit_set(this.id, 7);
	}
	is_secure() {
		return this.constructor.is_secure();
	}
	get id() {
		return this.constructor.id;
	}
	get label() {
		return this.constructor.label;
	}
}

/**
 * Create a new Message type class.
 * @param {Object} specification - specification of the new Message type.
 * @returns {Class} A new Message type class.
 */
const create_message_type = (specification) => {
	const Message_Type = class extends Abstract_Message {}
	for (let [key, value] of Object.entries(specification)) {
		//Message_Type.prototype[key] = value;
		Message_Type[key] = value;
	}
	return Message_Type;
}

/**
 * This class represents the message type "FRAGMENT_ACK".
 * Sent to acknowledge the receival of a fragment of a message (except for the last one).
 * (Java class "de.eq3.ble.key.android.a.a.t" in original app)
 * @class
 */
const Fragment_Ack_Message = create_message_type(/** @lends Fragment_Ack_Message */ {
	id: 0x00,
	label: 'FRAGMENT_ACK',
	encode: ((data) =>
		[data.fragment_id]
	),
	properties: {
		fragment_id: ((data_bytes) => data_bytes[0]),
	},
});

/**
 * This class represents the message type "CLOSE_CONNECTION".
 * Sent to the Smart Lock in order to close the connection.
 * (Java class "de.eq3.ble.key.android.a.a.o" in original app)
 * @class
 */
const Close_Connection_Message = create_message_type(/** @lends Close_Connection_Message */ {
	id: 0x06,
	label: 'CLOSE_CONNECTION',
});

/**
 * This class represents the message type "COMMAND".
 * Used to perform one of the three possible commands/actions:
 * 0: Lock
 * 1: Unlock
 * 2: Open
 * (Java class "de.eq3.ble.key.android.a.a.p" in original app)
 * @class
 */
const Command_Message = create_message_type(/** @lends Command_Message */ {
	id: 0x87,
	label: 'COMMAND',
	encode: ((data) =>
		[data.command_id]
	),
	properties: {
		command_id: ((data_bytes) => data_bytes[0]),
	},
});

/**
 * This class represents the message type "CONNECTION_INFO".
 * Sent from the Smart Lock in response to a "CONNECTION_REQUEST" message; contains information about the connection.
 * (Java class "de.eq3.ble.key.android.a.a.q" in original app)
 * @class
 */
const Connection_Info_Message = create_message_type(/** @lends Connection_Info_Message */ {
	id: 0x03,
	label: 'CONNECTION_INFO',
	properties: {
		user_id: ((data_bytes) => data_bytes[0]),
		remote_session_nonce: ((data_bytes) => data_bytes.slice(1, 9)),
		bootloader_version: ((data_bytes) => data_bytes[10]),
		application_version: ((data_bytes) => data_bytes[11]),
	},
});

/**
 * This class represents the message type "CONNECTION_REQUEST".
 * Sent to the Smart Lock in order to set up a secure connection.
 * (Java class "de.eq3.ble.key.android.a.a.r" in original app)
 * @class
 */
const Connection_Request_Message = create_message_type(/** @lends Connection_Request_Message */ {
	id: 0x02,
	label: 'CONNECTION_REQUEST',
	encode: (({user_id, local_session_nonce}) =>
		[user_id, ...local_session_nonce]
	),
	properties: {
		user_id: ((data_bytes) => data_bytes[0]),
		local_session_nonce: ((data_bytes) => data_bytes.slice(1, 9)),
	},
});

//- _REQUIRE_ES_ '../library/is_bit_set.js'
/**
 * This class represents the message type "MOUNT_OPTIONS_SET".
 * Sent to the Smart Lock in order to set up the parameters of the lock (left/right side, horizontal/vertical, number of lock turns).
 * (Java class "de.eq3.ble.key.android.a.a.ab" in original app)
 * @class
 */
const Mount_Options_Set_Message = create_message_type(/** @lends Mount_Options_Set_Message */ {
	id: 0x86,
	label: 'MOUNT_OPTIONS_SET',
	encode: (({turn_direction_is_left, neutral_position_is_horizontal, lock_turns}) =>
		[
			(bit_mask_for_value(turn_direction_is_left, 0) | bit_mask_for_value(neutral_position_is_horizontal, 1)),
			lock_turns,
			0,
			0,
			0,
			0,
			0,
			0,
		]
	),
	properties: {
		turn_direction_is_left: ((data_bytes) => is_bit_set(data_bytes[0], 0)),
		neutral_position_is_horizontal: ((data_bytes) => is_bit_set(data_bytes[0], 1)),
		lock_turns: ((data_bytes) => (data_bytes[1] & 7)),
	},
});

//- _REQUIRE_ES_ '../library/convert_integer_to_uint8array.js'
//- _REQUIRE_ES_ '../library/convert_uint8array_to_integer.js'
//- _REQUIRE_ES_ '../library/pad_array_end.js'
/**
 * This class represents the message type "PAIRING_REQUEST".
 * (Java class "de.eq3.ble.key.android.a.a.ac" in original app)
 * @class
 */
const Pairing_Request_Message = create_message_type(/** @lends Pairing_Request_Message */ {
	id: 0x04,
	label: 'PAIRING_REQUEST',
	encode: ((data) =>
		[
			data.user_id,
			...pad_array_end(data.encrypted_pair_key, 22, 0),
			...convert_integer_to_uint8array(data.security_counter, 2),
			...data.authentication_value,
		]
	),
	properties: {
		user_id: ((data_bytes) => data_bytes[0]),
		encrypted_pair_key: ((data_bytes) => data_bytes.slice(1, 23)),
		security_counter: ((data_bytes) => convert_uint8array_to_integer(data_bytes, 23, 2)),
		authentication_value: ((data_bytes) => data_bytes.slice(25, 29)),
	},
});

/**
 * This class represents the message type "STATUS_CHANGED_NOTIFICATION".
 * (Java class "de.eq3.ble.key.android.a.a.ae" in original app)
 * @class
 */
const Status_Changed_Notification_Message = create_message_type(/** @lends Status_Changed_Notification_Message */ {
	id: 0x05,
	label: 'STATUS_CHANGED_NOTIFICATION',
});

//- _REQUIRE_ES_ '../library/is_bit_set.js'
/**
 * This class represents the message type "STATUS_INFO".
 * (Java class "de.eq3.ble.key.android.a.a.af" in original app)
 * @class
 */
const Status_Info_Message = create_message_type(/** @lends Status_Info_Message */ {
	id: 0x83,
	label: 'STATUS_INFO',
	properties: {
		a: ((data_bytes) => is_bit_set(data_bytes[0], 6)),
		user_right_type: ((data_bytes) => ((data_bytes[0] & 0x30) >> 4)),
		battery_low: ((data_bytes) => is_bit_set(data_bytes[1], 7)),
		f: ((data_bytes) => is_bit_set(data_bytes[1], 4)),
		pairing_allowed: ((data_bytes) => is_bit_set(data_bytes[1], 0)),
		h: ((data_bytes) => is_bit_set(data_bytes[2], 5)),
		i: ((data_bytes) => is_bit_set(data_bytes[2], 4)),
		j: ((data_bytes) => is_bit_set(data_bytes[2], 3)),
		lock_status: ((data_bytes) => (data_bytes[2] & 0x07)),
		l: ((data_bytes) => data_bytes[4]),
		m: ((data_bytes) => data_bytes[5]),
	},
});

/**
 * This class represents the message type "STATUS_REQUEST".
 * Sent to the Smart Lock in order to set the current date/time and request status information.
 * (Java class "de.eq3.ble.key.android.a.a.ag" in original app)
 * @class
 */
const Status_Request_Message = create_message_type(/** @lends Status_Request_Message */ {
	id: 0x82,
	label: 'STATUS_REQUEST',
	encode: (data) => {
		const date = data.date;
		return [
			(date.getFullYear() - 2000),
			(date.getMonth() + 1),
			date.getDate(),
			date.getHours(),
			date.getMinutes(),
			date.getSeconds(),
		];
	},
	properties: {
		date: ((data_bytes) => (new Date(
			(data_bytes[0] + 2000),
			(data_bytes[1] - 1),
			data_bytes[2],
			data_bytes[3],
			data_bytes[4],
			data_bytes[5],
		)))
	},
});

//- _REQUIRE_ES_ '../library/pad_array_end.js'
//- _REQUIRE_ES_ '../library/convert_string_to_utf8_encoded_uint8array.js'
//- _REQUIRE_ES_ '../library/convert_utf8_encoded_uint8array_to_string.js'
/**
 * This class represents the message type "USER_NAME_SET".
 * Sent to the Smart Lock in order to change a user name.
 * (Java class "de.eq3.ble.key.android.a.a.al" in original app)
 * @class
 */
const User_Name_Set_Message = create_message_type(/** @lends User_Name_Set_Message */ {
	id: 0x90,
	label: 'USER_NAME_SET',
	encode: ((data) =>
		[
			data.user_id,
			...pad_array_end(convert_string_to_utf8_encoded_uint8array(data.user_name), 20, 0),
		]
	),
	properties: {
		user_id: ((data_bytes) => data_bytes[0]),
		user_name: ((data_bytes) => convert_utf8_encoded_uint8array_to_string(data_bytes.slice(1, data_bytes.indexOf(0, 1)))),
	},
});

//- _REQUIRE_ES_ '../library/create_lookup_table_by_object_property_value.js'
/**
 * This class represents the message type "ANSWER_WITH_SECURITY".
 * (Java class "de.eq3.ble.key.android.a.a.e" in original app)
 * @class
 */
const Answer_With_Security_Message = create_message_type(/** @lends Answer_With_Security_Message */ {
	id: 0x81,
	label: 'ANSWER_WITH_SECURITY',
	properties: {
		a: ((data_bytes) => ((data_bytes[0] & 0x80) === 0)),
		b: ((data_bytes) => ((data_bytes[0] & 0x81) === 1)),
	},
});

/**
 * This class represents the message type "ANSWER_WITHOUT_SECURITY".
 * (Java class "de.eq3.ble.key.android.a.a.f" in original app)
 * @class
 */
const Answer_Without_Security_Message = create_message_type(/** @lends Answer_Without_Security_Message */ {
	id: 0x01,
	label: 'ANSWER_WITHOUT_SECURITY',
	properties: {
		a: ((data_bytes) => ((data_bytes[0] & 0x80) === 0)),
		b: ((data_bytes) => ((data_bytes[0] & 0x81) === 1)),
	},
});

/**
 * This class represents the message type "USER_INFO".
 * Sent to the Smart Lock in order to close the connection.
 * (Java class "de.eq3.ble.key.android.a.a.ah" in original app)
 * @class
 */
const User_Info_Message = create_message_type(/** @lends User_Info_Message */ {
	id: 0x8F,
	label: 'USER_INFO',
});

/**
 * Array/List of all currently implemented message types.
 * @constant
 * @type {Class[]}
 */
const MESSAGE_TYPES = [
	Answer_With_Security_Message,
	Answer_Without_Security_Message,
	Fragment_Ack_Message,
	Close_Connection_Message,
	Command_Message,
	Connection_Info_Message,
	Connection_Request_Message,
	Mount_Options_Set_Message,
	Pairing_Request_Message,
	Status_Changed_Notification_Message,
	Status_Info_Message,
	Status_Request_Message,
	User_Info_Message,
	User_Name_Set_Message,
];

/**
 * An object for looking up message types by their ID.
 * @constant
 * @type {object}
 */
const MESSAGE_TYPES_BY_ID = create_lookup_table_by_object_property_value(MESSAGE_TYPES, 'id');

/**
 * What this module exports.
 */
module.exports = {
	Fragment_Ack_Message: Fragment_Ack_Message,
	Close_Connection_Message: Close_Connection_Message,
	Command_Message: Command_Message,
	Connection_Info_Message: Connection_Info_Message,
	Connection_Request_Message: Connection_Request_Message,
	Mount_Options_Set_Message: Mount_Options_Set_Message,
	Pairing_Request_Message: Pairing_Request_Message,
	Status_Changed_Notification_Message: Status_Changed_Notification_Message,
	Status_Info_Message: Status_Info_Message,
	Status_Request_Message: Status_Request_Message,
	User_Name_Set_Message: User_Name_Set_Message,
	MESSAGE_TYPES_BY_ID: MESSAGE_TYPES_BY_ID,
};

