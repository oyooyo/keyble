'use strict';
var ansi_color_code, ansi_colorize, argparse, delay, exit_process, first_valid_value, is_array, is_of_type, is_string, is_valid_value, process_input,
  splice = [].splice;

// Import/Require the "argparse" module that provides an easy to use command line argument parser
argparse = require('argparse');

// Returns the ANSI escape code for ANSI color code <code>
ansi_color_code = function(code) {
  return `\x1b[${code}m`;
};

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

// Colorize string <string> by ANSI-escaping it with ANSI sequence <color>
ansi_colorize = function(string, code) {
  code = first_valid_value(code, 31);
  return `${ansi_color_code(code)}${string}${ansi_color_code(0)}`;
};

// Returns a Promise that resolves after <milliseconds> milliseconds (defaults to 0)
delay = function(milliseconds) {
  milliseconds = first_valid_value(milliseconds, 0);
  return new Promise(function(resolve, reject) {
    return setTimeout(function() {
      return resolve();
    }, milliseconds);
  });
};

// Exit the current process with status code <status_code>. "noble" (the Bluetooth LE library being used) currently requires so: https://github.com/noble/noble/issues/299
exit_process = function(status_code) {
  status_code = first_valid_value(status_code, 0);
  return process.exit(status_code);
};

// Checks if <value> is an array. Returns true if it is an array, false otherwise
is_array = function(value) {
  return Array.isArray(value);
};

// Returns a function with argument <value> that returns true if <value> is of type <type_string>, false otherwise
is_of_type = function(type_string) {
  return function(value) {
    return typeof value === type_string;
  };
};

// Returns true if the passed argument <value> is a string, false otherwise
is_string = is_of_type('string');

// Process one or more <input_sources...>, and call <input_handler> for each input string, passing the input strings as argument to <input_handler>. Every input source must either be a string, an array of strings, or a Readable stream like process.stdin
process_input = function(...input_sources) {
  var input_handler, ref;
  ref = input_sources, [...input_sources] = ref, [input_handler] = splice.call(input_sources, -1);
  return new Promise(function(resolve, reject) {
    var closed, handle_next, inactive, input_source, input_strings, readline, readline_interface;
    input_source = input_sources.find(function(input_source) {
      return is_valid_value(input_source) && (!is_array(input_source) || (input_source.length > 0));
    });
    if (is_string(input_source)) {
      input_source = [input_source];
    }
    if (is_array(input_source)) {
      handle_next = function() {
        if (input_source.length === 0) {
          resolve();
        } else {
          Promise.resolve(input_handler(input_source.shift())).then(function() {
            return handle_next();
          });
        }
      };
      handle_next();
    } else {
      input_strings = [];
      closed = false;
      inactive = true;
      handle_next = function() {
        if (inactive) {
          if (input_strings.length > 0) {
            inactive = false;
            Promise.resolve(input_handler(input_strings.shift())).then(function() {
              inactive = true;
              return handle_next();
            });
          } else if (closed) {
            resolve();
          }
        }
      };
      // The input source is expected to be a readable stream; read the stream line by line and pass the stripped lines to the input handler
      readline = require('readline');
      readline_interface = readline.createInterface({
        input: input_source,
        output: null
      });
      readline_interface.on('line', function(input_line) {
        if (input_strings.push(input_line.trim()) === 1) {
          handle_next();
        }
      });
      readline_interface.on('close', function() {
        closed = true;
        handle_next();
      });
    }
  });
};

// What this module exports
module.exports = {
  ArgumentParser: argparse.ArgumentParser,
  ansi_colorize: ansi_colorize,
  delay: delay,
  exit: exit_process,
  process_input: process_input
};

//# sourceMappingURL=cli.js.map
