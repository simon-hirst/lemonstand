'use strict';

const ordersService = require('..');
const assert = require('assert').strict;

assert.strictEqual(ordersService(), 'Hello from ordersService');
console.info('ordersService tests passed');
