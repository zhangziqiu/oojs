require('../../src/oojs.js');
require('../../src/oojs/event.js');
var Benchmark = require('benchmark');
var suite = new Benchmark.Suite();

var events = require('events');
var oojsEvent = oojs.using('oojs.event');

suite.add('event-native-create', {
    fn: function () {
        var ev = new events.EventEmitter();
    }
}).add('event-oojs-create', {
    fn: function () {
        var ev = oojs.create(oojsEvent);
    }
}).on('cycle', function (event) {
    console.log(String(event.target));
}).run({
    'async': true
});