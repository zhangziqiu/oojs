var assert = require('assert');
require('../../../../src/core.js');

var myClass1 = require('./myClass1');
assert.ok(myClass1.myTest);

var myClass2 = require('./myClass2');
assert.ok(myClass2.myTest, 'test myClass2');

var myClass3 = require('./myClass3');
assert.ok(myClass3.myTest, 'test myClass3');
 