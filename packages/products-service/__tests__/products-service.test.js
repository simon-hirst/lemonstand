'use strict';

const productsService = require('..');
const assert = require('assert').strict;

assert.strictEqual(productsService(), 'Hello from productsService');
console.info('productsService tests passed');
