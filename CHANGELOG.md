# Changelog

## v0.2.0 *(2020/10/08)*

- Rewrote source code in ECMAscript/JavaScript
- Shortened file keyble.js by moving all message types to message_types.js and all utility functions to utils.js
- Using async functions instead of Promises where possible
- Making use of new ECMAscript features like async generators

## v0.1.14 *(2018/12/25)*

- Added a little more debug output
- Updated dependencies to latest versions

## v0.1.13 *(2018/12/13)*

- Added keyble:communication debug output
- Removed file package-lock.json

## v0.1.12 *(2018/10/17)*

- Improved documentation
- Minor changes

## v0.1.11 *(2018/10/17)*

- Corrected wrong default value for the --timeout argument
- Corrected and renamed the various statuses to "UNKNOWN", "MOVING", "UNLOCKED", "LOCKED" and "OPENED"

## v0.1.10 *(2018/10/16)*

- Improved description of the `--auto_disconnect_time` and `--status_update_time` arguments
- Added `--timeout` argument and helper function keyble.utils.time_limit()
- Increased the default for `--auto_disconnect_time` to 30 seconds

## v0.1.9 *(2018/10/15)*

- Opening the door via Key_Ble.open() no longer waits for the "OPENED" state to occur, but the "UNLOCKED" state. This is because the "OPENED" state apparently is not always being reported.

## v0.1.8 *(2018/10/13)*

- Yet another minor correction

## v0.1.7 *(2018/10/13)*

- Minor corrections

## v0.1.6 *(2018/10/13)*

- Fixed a number of bugs
- Added *--status_update_time* and *--auto_disconnect_time* command line arguments
- The *keyble-sendcommand* tool should now output the actual status, and recognize status changes caused by other users etc.
- The *keyble-sendcommand* tool now accepts the command "status" that will trigger a manual status update
- Started to document the API

## v0.1.5 *(2018/09/15)*

- Updated some dependencies

## v0.1.4 *(2018/09/11)*

- Updated to use simble v0.2.0

## v0.1.3 *(2018/09/11)*

- Fixed bug that prevented using keyble in filter mode

## v0.1.0 *(2018/09/05)*

- Initial version
