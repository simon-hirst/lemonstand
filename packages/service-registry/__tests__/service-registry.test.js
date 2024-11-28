'use strict';

const serviceRegistry = require('..');
const assert = require('assert').strict;

assert.strictEqual(serviceRegistry(), 'Hello from serviceRegistry');
console.info('serviceRegistry tests passed');
