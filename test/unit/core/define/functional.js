var assert = require('assert');
require('../../../../src/oojs.js');

var myClass1 = require('./myClass1');
assert.equal(myClass1.myTest, 'test myClass1');

require('./myClass2');
var myClass2 = oojs.using('myClass2');
assert.equal(myClass2.myTest, 'test myClass2');

var myClass3 = require('./myClass3');
assert.equal(myClass3.myTest, 'test myClass3');

//回归测试
assert.equal(myClass1.myTest, 'test myClass1');
assert.equal(myClass2.myTest, 'test myClass2');
assert.equal(myClass3.myTest, 'test myClass3');
 