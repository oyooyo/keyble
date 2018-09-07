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

With Node.js/npm installed, you can install *keyble* globally by running on a command line:

    $ npm install -g keyble --unsafe-perm

The [`--unsafe-perm`](https://docs.npmjs.com/misc/config#unsafe-perm) flag seems to be necessary in order to install *keyble* globally via the `-g` flag (at least under Linux). If installing locally, without the `-g` flag, it works fine without the `--unsafe-perm` flag. This issue seems to be caused by one of *keyble*'s dependencies (see [#707](https://github.com/noble/noble/issues/707)).

### Linux

If using Linux...

- you will probably need to run this command with *sudo*
- please read [these remarks about *"Running without root/sudo"*](https://github.com/noble/noble#running-on-linux).

## Command line tools

## keyble-registeruser

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

### Piping data into keyble-registeruser

If the QR-Code data is not passed on the command line via the `--qr_code_data/-q` argument, *keyble-registeruser* will read the data from STDIN instead. This allows simply piping the output of a QR-Code-Reader into *keyble-registeruser*.

For example, if you have a Webcam and the *[zbar](http://zbar.sourceforge.net/)* tools installed *(`sudo apt-get install zbar-tools`)*, you can run:

    $ zbarcam --raw | keyble-registeruser
    
    Press and hold "Unlock" button until the yellow light flashes in order to enter pairing mode
    Registering user on Smart Lock with address "01:23:56:67:89:ab", card key "0123456789abcdef0123456789abcdef" and serial "NEQ1234567"...
    User registered. Use arguments: --address 01:23:56:67:89:ab --user_id 1 --user_key ca78ad9b96131414359e5e7cecfd7f9e
    Setting user name to "PC"...
    User name changed, finished registering user.

The above command is the recommended way to register a new user under Linux.

## keyble-sendcommand

With a valid user ID and user key, as obtained by running the *keyble-registeruser* tool, we can now actually control (=open/lock/unlock) the Smart Lock.

This is what the *keyble-sendcommand* tool is for.

    usage: keyble-sendcommand [-h] --address ADDRESS --user_id
                              USER_ID --user_key USER_KEY
                              [--command {lock,open,unlock}]
    
    
    Control (lock/unlock/open) an eqiva eQ-3 Bluetooth smart lock.
    
    Optional arguments:
      -h, --help            Show this help message and exit.
      --address ADDRESS, -a ADDRESS
                            The smart lock's MAC address
      --user_id USER_ID, -u USER_ID
                            The user ID
      --user_key USER_KEY, -k USER_KEY
                            The user key
      --command {lock,open,unlock}, -c {lock,open,unlock}
                            The command to perform. If not provided on the 
                            command line, the command(s) will be read as input 
                            lines from STDIN instead

Usage example:

    $ keyble-sendcommand --address 01:23:56:67:89:ab --user_id 1 --user_key ca78ad9b96131414359e5e7cecfd7f9e --command open

    Sending command "open"...
    Command "open" sent.

### Piping data into keyble-sendcommand

If the actual command/action ("open"/"lock"/"unlock") is not passed on the command line via the --command/-c argument, *keyble-sendcommand* will read the command(s) from STDIN instead. This allows piping the output of another program into *keyble-sendcommand*.

For example, if you have the *mosquitto-clients* tools installed *(`sudo apt-get install mosquitto-clients`)*, you could easily make your Smart Lock controllable via MQTT by running a command similar to this:

    $ mosquitto_sub -h 192.168.0.2 -t "door_lock/action" | keyble-sendcommand -a 01:23:56:67:89:ab -u 1 -k ca78ad9b96131414359e5e7cecfd7f9e

Assuming a MQTT broker with IP address 192.168.0.2, sending message "open" to the MQTT topic "door_lock/action" for example would then open the Smart Lock.

**As I just discovered, this feature does not work properly yet - there seems to be bug, it currently only works for the first command.**

## Beware of firmware updates

Be aware that the vendor might *(at least temporarily)* render this software useless with a future firmware update.

This software was developed against firmware version 1.7, which is the latest firmware version as of now *(2018/09/05)*.

If the vendor releases a newer firmware version, better not instantly update the firmware; wait for confirmation that the new firmware version is safe.
