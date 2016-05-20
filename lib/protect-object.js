'use strict';

const RESERVED_GET = [
    'inspect',
    'toString',
    'toLocaleString',
    'isGenerator',
    'call',
    'bind',
    'apply',
    'prototype',
    'toSource'
];

module.exports = function protectObject (obj) {
    const handler = {
        get: function (receiver, name) {
            if (name in receiver || RESERVED_GET.indexOf(name) !== -1) {
                return receiver[name];
            } else {
                throw new Error('Can not get property. Object has no property `' + name + '`.');
            }
        },
        set: function (receiver, name, value) {
            if (name in receiver) {
                receiver[name] = value;

                return true;
            } else {
                throw new Error('Can not set property. Object has no property `' + name + '`.');
            }
        }
    };

    if (typeof obj === 'function') {
        return (...args) => {
            const target = obj(...args);

            if (typeof target !== 'object') {
                throw new Error('Provided function must return an object.');
            }

            return new Proxy(target, handler);
        };
    } else if (typeof obj === 'object') {
        return new Proxy(obj, handler);
    } else {
        throw new Error('Provided argument is not an object or function.');
    }
};