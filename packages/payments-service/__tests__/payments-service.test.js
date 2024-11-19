'use strict';

const paymentsService = require('..');
const assert = require('assert').strict;

assert.strictEqual(paymentsService(), 'Hello from paymentsService');
console.info('paymentsService tests passed');
