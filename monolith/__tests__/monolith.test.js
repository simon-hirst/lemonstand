'use strict';

const monolith = require('..');
const assert = require('assert').strict;

assert.strictEqual(monolith(), 'Hello from monolith');
console.info('monolith tests passed');
