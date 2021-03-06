// Load modules

var Fs = require('fs');
var Async = require('async');


// Declare internals

var internals = {};


// Clone object or array

exports.clone = function (obj) {

    if (obj === null ||
        obj === undefined) {

        return null;
    }

    var newObj = (obj instanceof Array) ? [] : {};

    for (var i in obj) {
        if (obj.hasOwnProperty(i)) {
            if (obj[i] instanceof Date) {
                newObj[i] = new Date(obj[i].getTime());
            }
            else if (obj[i] instanceof RegExp) {
                var flags = '' + (obj[i].global ? 'g' : '') + (obj[i].ignoreCase ? 'i' : '') + (obj[i].multiline ? 'm' : '') + (obj[i].sticky ? 'y' : '');
                newObj[i] = new RegExp(obj[i].source, flags);
            }
            else if (typeof obj[i] === 'object') {
                newObj[i] = exports.clone(obj[i]);
            }
            else {
                newObj[i] = obj[i];
            }
        }
    }

    return newObj;
};


// Merge all the properties of source into target, source wins in conflic, and by default null and undefined from source are applied

exports.merge = function (target, source, isNullOverride /* = true */, isMergeArrays /* = true */) {

    if (source) {
        if (source instanceof Array) {
            if (isMergeArrays !== false) {                                      // Defaults to true
                target = (target || []).concat(source);
            }
            else {
                target = source;
            }
        }
        else {
            target = target || {};

            for (var key in source) {
                if (source.hasOwnProperty(key)) {
                    var value = source[key];

                    if (value &&
                        typeof value === 'object') {

                        if (value instanceof Date) {
                            target[key] = new Date(value.getTime());
                        }
                        else if (value instanceof RegExp) {
                            var flags = '' + (value.global ? 'g' : '') + (value.ignoreCase ? 'i' : '') + (value.multiline ? 'm' : '') + (value.sticky ? 'y' : '');
                            target[key] = new RegExp(value.source, flags);
                        }
                        else {
                            target[key] = exports.merge(target[key], source[key], isNullOverride, isMergeArrays);
                        }
                    }
                    else {
                        if (value !== null && value !== undefined) {            // Explicit to preserve empty strings
                            target[key] = value;
                        }
                        else if (isNullOverride !== false) {                    // Defaults to true
                            target[key] = value;
                        }
                    }
                }
            }
        }
    }

    return target;
};


// Apply options to a copy of the defaults

exports.applyToDefaults = function (defaults, options) {

    if (options === false) {                                        // If options is set to false, return null
        return null;
    }

    var copy = exports.clone(defaults);

    if (options === true) {                                         // If options is set to true, use defaults
        return copy;
    }

    return exports.merge(copy, options, false, false);
};


// Remove duplicate items from array

exports.unique = function (array, key) {

    var index = {};
    var result = [];

    for (var i = 0, il = array.length; i < il; ++i) {
        if (index[array[i][key]] !== true) {

            result.push(array[i]);
            index[array[i][key]] = true;
        }
    }

    return result;
};


// Convert array into object

exports.mapToObject = function (array, key) {

    if (!array) {
        return null;
    }

    var obj = {};
    for (var i = 0, il = array.length; i < il; ++i) {
        if (key) {
            if (array[i][key]) {
                obj[array[i][key]] = true;
            }
        }
        else {
            obj[array[i]] = true;
        }
    }

    return obj;
};


// Find the common unique items in two arrays

exports.intersect = function (array1, array2) {

    if (!array1 || !array2) {
        return [];
    }

    var common = [];
    var hash = exports.mapToObject(array1);
    var found = {};
    for (var i = 0, il = array2.length; i < il; ++i) {
        if (hash[array2[i]] && !found[array2[i]]) {
            common.push(array2[i]);
            found[array2[i]] = true;
        }
    }

    return common;
};


// Flatten array

exports.flatten = function (array, target) {

    var result = target || [];

    for (var i = 0, il = array.length; i < il; ++i) {
        if (Array.isArray(array[i])) {
            exports.flatten(array[i], result);
        }
        else {
            result.push(array[i]);
        }
    }

    return result;
};


// Remove keys

exports.removeKeys = function (object, keys) {

    for (var i = 0, il = keys.length; i < il; i++) {
        delete object[keys[i]];
    }
};


// Inherits a selected set of methods from an object, wrapping functions in asynchronous syntax and catching errors

exports.inheritAsync = function (self, obj, keys) {

    keys = keys || null;

    for (var i in obj) {
        if (obj.hasOwnProperty(i)) {
            if (keys instanceof Array &&
                keys.indexOf(i) < 0) {

                continue;
            }

            self.prototype[i] = (function (fn) {

                return function (callback) {

                    var result = null;
                    try {
                        result = fn();
                    }
                    catch (err) {
                        return callback(err);
                    }

                    return callback(null, result);
                };
            })(obj[i]);
        }
    }
};


exports.callStack = function (slice) {

    // http://code.google.com/p/v8/wiki/JavaScriptStackTraceApi

    var v8 = Error.prepareStackTrace;
    Error.prepareStackTrace = function (err, stack) {

        return stack;
    };

    var capture = {};
    Error.captureStackTrace(capture, arguments.callee);
    var stack = capture.stack;

    Error.prepareStackTrace = v8;

    var trace = [];
    stack.forEach(function (item) {

        trace.push([item.getFileName(), item.getLineNumber(), item.getColumnNumber(), item.getFunctionName(), item.isConstructor()]);
    });

    if (slice) {
        return trace.slice(slice);
    }

    return trace;
};


exports.displayStack = function (slice) {

    var trace = exports.callStack(slice === undefined ? 1 : slice + 1);
    var display = [];
    trace.forEach(function (row) {

        display.push((row[4] ? 'new ' : '') + row[3] + ' (' + row[0] + ':' + row[1] + ':' + row[2] + ')');
    });

    return display;
};


exports.abort = function (message) {

    if (process.env.NODE_ENV === 'test') {
        throw new Error(message || 'Unknown error');
    }
    else {
        console.log('ABORT: ' + message + '\n\t' + exports.displayStack(1).join('\n\t'));
        process.exit(1);
    }
};


exports.assert = function (condition, message) {

    if (!condition) {
        exports.abort(message);
    }
};


exports.executeRequestHandlers = function (handlers, request, callback) {

    callback = callback || function () { };

    if (!handlers) {
        return callback();
    }

    var list = (handlers instanceof Array ? handlers : [handlers]);
    Async.forEachSeries(list, function (func, next) {

        func(request, next);
    },
    function (err) {

        return callback(err);
    });
};


exports.loadDirModules = function (path, excludeFiles, target) {      // target(filename, name, capName)

    var exclude = {};
    for (var i = 0, il = excludeFiles.length; i < il; ++i) {
        exclude[excludeFiles[i] + '.js'] = true;
    }

    Fs.readdirSync(path).forEach(function (filename) {

        if (/\.js$/.test(filename) &&
            !exclude[filename]) {

            var name = filename.substr(0, filename.lastIndexOf('.'));
            var capName = name.charAt(0).toUpperCase() + name.substr(1).toLowerCase();

            if (typeof target !== 'function') {
                target[capName] = require(path + '/' + name);
            }
            else {
                target(path + '/' + name, name, capName);
            }
        }
    });
};


exports.rename = function (obj, from, to) {

    obj[to] = obj[from];
    delete obj[from];
};


exports.Timer = function () {

    this.reset();
};


exports.Timer.prototype.reset = function () {

    this.ts = Date.now();
};


exports.Timer.prototype.elapsed = function () {

    return Date.now() - this.ts;
};


// Load and parse package.json process root or given directory

exports.loadPackage = function (dir) {

    var result = {};
    var filepath = (dir || process.env.PWD) + '/package.json';
    if (Fs.existsSync(filepath)) {
        try {
            result = JSON.parse(Fs.readFileSync(filepath));
        }
        catch (e) { }
    }

    return result;
};


// Escape string for Regex construction

exports.escapeRegex = function (string) {

    // Escape ^$.*+-?=!:|\/()[]{},
    return string.replace(/[\^\$\.\*\+\-\?\=\!\:\|\\\/\(\)\[\]\{\}\,]/g, '\\$&');
};


// Return an error as first argument of a callback

exports.toss = function (condition /*, [message], callback */) {

    var message = (arguments.length === 3 ? arguments[1] : '');
    var callback = (arguments.length === 3 ? arguments[2] : arguments[1]);

    var err = (message instanceof Error ? message : (message ? new Error(message) : (condition instanceof Error ? condition : new Error())));

    if (condition instanceof Error ||
        !condition) {

        return callback(err);
    }
};


// Base64url (RFC 4648) encode

exports.base64urlEncode = function (value) {

    return (new Buffer(value, 'binary')).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/\=/g, '');
};


// Base64url (RFC 4648) decode

exports.base64urlDecode = function (encoded) {

    try {
        return (new Buffer(encoded.replace(/-/g, '+').replace(/:/g, '/'), 'base64')).toString('binary');
    }
    catch (err) {
        return err;
    }
};


// Escape attribute value for use in HTTP header

exports.escapeHeaderAttribute = function (attribute) {

    return attribute.replace(/\\/g, '\\\\').replace(/\"/g, '\\"');
};


// Escape string for inclusion in HTML

internals.htmlEscaped = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;'
};

exports.escapeHtml = function (string) {

    if (!string) {
        return '';
    }

    if (/[&<>"'`]/.test(string) === false) {
        return string;
    }

    return string.replace(/[&<>"'`]/g, function (chr) {

        return internals.htmlEscaped[chr];
    });
};
