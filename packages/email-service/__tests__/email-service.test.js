'use strict';

const emailService = require('..');
const assert = require('assert').strict;

assert.strictEqual(emailService(), 'Hello from emailService');
console.info('emailService tests passed');
