require('../../src/oojs.js');
var Benchmark = require('benchmark');
var suite = new Benchmark.Suite();

var funcClass = require('./create-native-class.js');
var oojsClass = require('./create-oojs-class.js');

// add tests
suite.add('new Function', {
    fn: function () {
        var obj = new funcClass();
    }
}).add('oojs.create', {
    fn: function () {
        var obj = oojs.create(oojsClass);
    }
}).on('cycle', function (event) {
    console.log(String(event.target));
}).run({
    'async': true
});