require('../../src/oojs.js');
var Benchmark = require('benchmark');
var suite = new Benchmark.Suite();

var events = require('events');
var oojsEvent = oojs.using('oojs.event');

oojs.define({
    name: 'testClass',
    say: function(){
        //console.log(this.name);
    }
});
var testClass = oojs.using('testClass');


// add tests
suite.add('oojs.proxy', {
    fn: function () {        
        var proxyFunc = oojs.proxy(testClass, testClass.say);
        proxyFunc();        
    }
}).on('cycle', function (event) {
    console.log(String(event.target));
}).run({
    'async': true
});