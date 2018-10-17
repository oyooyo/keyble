# keyble

*keyble* is a set of command line tools for controlling/interfacing with [eqiva eQ-3 Bluetooth Smart Lock](https://www.eq-3.com/products/eqiva/bluetooth-smart-lock.html)s.

At a price of just about 60€, these Smart Locks offer an excellent price/performance ratio. But until now, these smart locks could only be controlled using the vendor's official Smartphone app, and could not be integrated into existing smart home systems.

## Current status

*keyble* is currently in an early alpha state:

- Only the most basic features are currently implemented:
    - Registering new users
    - Opening / locking / unlocking the smart lock
- The code still needs to be improved, there are a number of bugs etc. and the code is not very elegant yet

## Requirements

*keyble* requires the following hard- and software

- Bluetooth 4.0 compatible hardware
- [Node.js](https://nodejs.org/) *(only tested with Node.js 8.x so far - Node.js 10.x does not seem to work yet, due to a problem with Node 10.x in one of the dependencies)*
- Linux, OSX or Windows operating system *(only really tested on Linux so far)*

## Installation

### Global installation

By installing *keyble* globally, *keyble*'s command line tools are installed in your PATH, and are therefor available from everywhere.

With Node.js/npm installed, you can install/update *keyble* globally by running on a command line:

    npm install --update --global --unsafe-perm keyble

The [`--unsafe-perm`](https://docs.npmjs.com/misc/config#unsafe-perm) flag seems to be necessary in order to install *keyble* globally via the `--global` flag (at least under Linux). If installing locally, without the `--global` flag, it works fine without the `--unsafe-perm` flag. This issue seems to be caused by one of *keyble*'s dependencies (see [#707](https://github.com/noble/noble/issues/707)).
You will probably need to run the above command with *sudo*, at least if using Linux.

*keyble* relies on a Node.js Bluetooth library called [*noble*](https://github.com/noble/noble/). If you have any problems installing/running *keyble*, chances are they are related to *noble* - therefor, it is generally advisable to read [the documentation on installing *noble*](https://github.com/noble/noble#prerequisites) if you witness any problems installing *keyble*.

In particular, please read [these remarks about *"Running without root/sudo"*](https://github.com/noble/noble#running-on-linux) if running on Linux.

### Local installation

To install/update *keyble* as a library/dependency instead, execute:

    npm install --update --save keyble

### Complete, step-by-step installation instructions for Debian-based Linuxes, especially for Raspberry Pi running Raspbian

The Raspberry Pi is probably the most popular platform to run *keyble* on, so I decided to provide complete, step-by-step installation instructions for that platform.
These instructions should, however, work on all other Debian-based Linuxes (like Ubuntu) as well.

    # (Optional, but recommended) Fully update/upgrade system
    sudo apt-get -y update && sudo apt-get -y dist-upgrade
    
    # Install Node.js v8
    wget -qO- https://deb.nodesource.com/setup_8.x | sudo -E bash -
    sudo apt-get install -y build-essential nodejs
    
    # Make sure required libraries for Bluetooth are installed
    sudo apt-get -y install bluetooth bluez libbluetooth-dev libudev-dev
    
    # Install keyble
    sudo npm install --update --global --unsafe-perm keyble
    
    # (Optional, but recommended) Allow keyble to be run without sudo
    sudo setcap cap_net_raw+eip $(eval readlink -f `which node`)
    
    # (Optional, but recommended) Install tools for controlling via MQTT
    sudo apt-get -y install mosquitto-clients

## Command line tools

### keyble-registeruser

In order to actually control an *eqiva eQ-3 Bluetooth Smart Lock*, a user ID and the corresponding 128-bit user key is required.
Since the original app provides no way to get these informations, it is necessary to first register a new user, using the information encoded in the QR-Code of the "*Key Card*"s that ship with the lock.

This is what the *keyble-registeruser* tool is for.

    usage: keyble-registeruser [-h] [--user_name USER_NAME]
                               [--qr_code_data QR_CODE_DATA]
    
    
    Register users on eqiva eQ-3 Bluetooth smart locks.
    
    Optional arguments:
      -h, --help            Show this help message and exit.
      --user_name USER_NAME, -n USER_NAME
                            The name of the user to register (default: "PC")
      --qr_code_data QR_CODE_DATA, -q QR_CODE_DATA
                            The information encoded in the QR-Code of the key 
                            card. If not provided on the command line, the data 
                            will be read as input lines from STDIN instead

Usage example:

    $ keyble-registeruser -n John -q M0123456789ABK0123456789ABCDEF0123456789ABCDEFNEQ1234567
    
    Press and hold "Unlock" button until the yellow light flashes in order to enter pairing mode
    Registering user on Smart Lock with address "01:23:56:67:89:ab", card key "0123456789abcdef0123456789abcdef" and serial "NEQ1234567"...
    User registered. Use arguments: --address 01:23:56:67:89:ab --user_id 1 --user_key ca78ad9b96131414359e5e7cecfd7f9e
    Setting user name to "John"...
    User name changed, finished registering user.

#### Piping data into keyble-registeruser

If the QR-Code data is not passed on the command line via the `--qr_code_data/-q` argument, *keyble-registeruser* will read the data from STDIN instead. This allows simply piping the output of a QR-Code-Reader into *keyble-registeruser*.

For example, if you have a Webcam and the *[zbar](http://zbar.sourceforge.net/)* tools installed *(`sudo apt-get install zbar-tools`)*, you can run:

    $ zbarcam --raw | keyble-registeruser
    
    Press and hold "Unlock" button until the yellow light flashes in order to enter pairing mode
    Registering user on Smart Lock with address "01:23:56:67:89:ab", card key "0123456789abcdef0123456789abcdef" and serial "NEQ1234567"...
    User registered. Use arguments: --address 01:23:56:67:89:ab --user_id 1 --user_key ca78ad9b96131414359e5e7cecfd7f9e
    Setting user name to "PC"...
    User name changed, finished registering user.

The above command is the recommended way to register a new user under Linux.

### keyble-sendcommand

With a valid user ID and user key, as obtained by running the *keyble-registeruser* tool, we can now actually control (=open/lock/unlock) the Smart Lock.

This is what the *keyble-sendcommand* tool is for.

    usage: keyble-sendcommand [-h] --address ADDRESS --user_id USER_ID --user_key
                              USER_KEY [--auto_disconnect_time AUTO_DISCONNECT_TIME]
                              [--status_update_time STATUS_UPDATE_TIME]
                              [--timeout TIMEOUT]
                              [--command {lock,open,unlock,status}]
                          
    
    Control (lock/unlock/open) an eqiva eQ-3 Bluetooth smart lock.
    
    Optional arguments:
      -h, --help            Show this help message and exit.
      --address ADDRESS, -a ADDRESS
                            The smart lock's MAC address
      --user_id USER_ID, -u USER_ID
                            The user ID
      --user_key USER_KEY, -k USER_KEY
                            The user key
      --auto_disconnect_time AUTO_DISCONNECT_TIME, -adt AUTO_DISCONNECT_TIME
                            The auto-disconnect time. If connected to the lock, 
                            the connection will be automatically disconnected 
                            after this many seconds of inactivity, in order to 
                            save battery. A value of 0 will deactivate 
                            auto-disconnect (default: 30)
      --status_update_time STATUS_UPDATE_TIME, -sut STATUS_UPDATE_TIME
                            The status update time. If no status information has 
                            been received for this many seconds, automatically 
                            connect to the lock and query the status. A value of 
                            0 will deactivate status updates (default: 600)
      --timeout TIMEOUT, -t TIMEOUT
                            The timeout time. Commands must finish within this 
                            many seconds, otherwise there is an error. A value of 
                            0 will deactivate timeouts (default: 40)
      --command {lock,open,unlock,status}, -c {lock,open,unlock,status}
                            The command to perform. If not provided on the 
                            command line, the command(s) will be read as input 
                            lines from STDIN instead

Usage example:

    $ keyble-sendcommand --address 01:23:56:67:89:ab --user_id 1 --user_key ca78ad9b96131414359e5e7cecfd7f9e --command open

    MOVING
    OPEN
    UNLOCKED

#### Piping data into keyble-sendcommand

If the actual command/action ("open"/"lock"/"unlock"/"status") is not passed on the command line via the --command/-c argument, *keyble-sendcommand* will read the command(s) from STDIN instead. This allows piping the output of another program into *keyble-sendcommand*.

For example, if you have the *mosquitto-clients* tools installed *(`sudo apt-get install mosquitto-clients`)*, you could easily make your Smart Lock controllable via MQTT by running a command similar to this:

    $ mosquitto_sub -h 192.168.0.2 -t "door_lock/action" | keyble-sendcommand -a 01:23:56:67:89:ab -u 1 -k ca78ad9b96131414359e5e7cecfd7f9e | mosquitto_pub -h 192.168.0.2 -l -r -t "door_lock/status"

Assuming a MQTT broker with IP address 192.168.0.2, sending message "open" to the MQTT topic "door_lock/action" for example would then open the Smart Lock; changes to the door lock status would be automatically published as retained messages to MQTT topic "door_lock/status".

## API

Beware that since *keyble* is still in early alpha state, the API is likely to still change a lot, probably with backwards-incompatible changes. Only a subset of the functionality has been documented yet, and only a few usage examples are provided.

### Creating a *Key_Ble* instance

    // Require the keyble module
    var keyble = require("keyble");

    // Create a new Key_Ble instance that represents one specific door lock
    var key_ble = new keyble.Key_Ble({
        address: "01:23:45:67:89:ab", // The bluetooth MAC address of the door lock
        user_id: 1, // The user ID
        user_key: "0123456789abcdef0123456789abcdef", // The user-specific 128 bit AES key
        auto_disconnect_time: 15, // After how many seconds of inactivity to auto-disconnect from the device (0 to disable)
        status_update_time: 600 // Automatically check for status after this many seconds without status updates (0 to disable)
    });
    
### Lock / Unlock / Open the door lock

    // Lock the door
    key_ble.lock()
    .then( () => {
        console.log("Door locked");
    });

    // Unlock the door
    key_ble.unlock()
    .then( () => {
        console.log("Door unlocked");
    });

    // Open the door
    key_ble.open()
    .then( () => {
        console.log("Door opened");
    });

### Listen for status changes

    // Lock the door
    key_ble.on("status_change", (new_status_id) => {
        console.log("New status:", new_status_id);
    });

### Timeouts for actions

*keyble* currently does not allow passing timeout values when calling actions like `key_ble.open()` which return [*Javascript Promises*](https://developers.google.com/web/fundamentals/primers/promises). As a result, the returned promise will often stay in *pending* state indefinitely if there is a problem, for example if the device is not in range. As a kind of compromise, there is a small helper function `keyble.utils.time_limit` which instead allows settings timeouts for every *Promise*:

    keyble.utils.time_limit(<promise>, <timeout_milliseconds>[, <timeout_error_message>])

It basically works like this: Instead of something like

    key_ble.open()
    .then( () => {
        console.log("Door opened");
    });

write

    keyble.utils.time_limit(key_ble.open(), 15000)
    .then( () => {
        console.log("Door opened");
    })
    .catch( (error) => {
        console.error("Error opening door!");
    });

to time-limit the open() action to 15000 milliseconds = 15 seconds.

## Beware of firmware updates

Be aware that the vendor might *(at least temporarily)* render this software useless with a future firmware update.

This software was developed against firmware version 1.7, which is the latest firmware version as of now *(2018/09/05)*.

If the vendor releases a newer firmware version, better not instantly update the firmware; wait for confirmation that the new firmware version is safe.

## Acknowledgements

A big thanks to everyone who helped developing and improving this software.

Especially...

- [henfri](https://github.com/henfri), who provided lots of useful feedback and helped improving the code
- [Ircama](https://github.com/Ircama), whose feedback etc. was also extremely helpful
