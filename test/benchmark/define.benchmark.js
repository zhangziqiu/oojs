require('../../src/oojs.js');
var Benchmark = require('benchmark');
var suite = new Benchmark.Suite();

var events = require('events');
var oojsEvent = oojs.using('oojs.event');


// add tests
suite.add('oojs.define', {
    fn: function () {
        oojs.define({
            name: 'test',
            namespace: 'my.project',
            $test: function () {
                this.myName2 = 'name2';
            },
            test: function () {
                this.myName3 = 'name3';
            }
        });
        oojs.classes = {};
    }
}).on('cycle', function (event) {
    console.log(String(event.target));
}).run({
    'async': true
});