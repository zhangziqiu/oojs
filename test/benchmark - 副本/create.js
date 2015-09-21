require('../../src/oojs.js');
require('../../src/oojs/event.js');
//require('../../bin/old.js');

var Benchmark = require('benchmark');
var suite = new Benchmark.Suite('create');
var events = require('events');
var oojsEvent = oojs.using('oojs.event');

// add tests
suite
    .add('new Function', {
      fn: function() {
          var ev = new events.EventEmitter();
      }
    })
    .add('oojs.create', {
        fn: function() {
            var ev = oojs.create(oojsEvent);
        }
    })
    .on('cycle', function (event) {
        console.log(String(event.target));
    })
    .on('complete', function () {
        console.log('Fastest is ' + this.filter('fastest').pluck('name'));
    })
    .run({'async': true});