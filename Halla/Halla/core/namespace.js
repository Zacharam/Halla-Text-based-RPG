// scripts/Halla/Halla/core/namespace.js
/**
 * @fileoverview Defines the global Halla namespace.
 * This should be the very first script included to ensure the Halla object
 * is available for all other scripts.
 */

(function(global) {
    'use strict';

    // Vytvoří jmenný prostor Halla na globálním objektu, pokud ještě neexistuje.
    // 'global' je bezpečná reference na globální objekt (v kontextu QCAD skriptů je to 'this').
    global.Halla = global.Halla || {};

    // Polyfill for Object.assign for ES5 environments like QtScript.
    // This ensures Object.assign is available if the environment doesn't support it natively.
    if (typeof Object.assign !== 'function') {
        // Define Object.assign if it doesn't exist.
        var assignPolyfill = function(target) {
                if (target === null || typeof target === 'undefined') {
                    throw new TypeError('Cannot convert undefined or null to object');
                }
                var to = Object(target);
                for (var i = 1; i < arguments.length; i++) {
                    var source = arguments[i];
                    if (source !== null && typeof source !== 'undefined') {
                        for (var key in source) {
                            if (Object.prototype.hasOwnProperty.call(source, key)) {
                                to[key] = source[key];
                            }
                        }
                    }
                }
                return to;
            };
        // Use defineProperty if available (ES5+) for a cleaner polyfill, otherwise fallback to direct assignment.
        if (typeof Object.defineProperty === 'function') {
            Object.defineProperty(Object, 'assign', { value: assignPolyfill, writable: true, configurable: true });
        } else {
            Object.assign = assignPolyfill;
        }
    }

})(this);
