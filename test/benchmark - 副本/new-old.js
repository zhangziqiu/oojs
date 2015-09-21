require('../../src/oojs.js');
require('../../src/oojs/event.js');
//require('../../bin/old.js');

var Benchmark = require('benchmark');
var suite = new Benchmark.Suite('create');
var oojsEvent = oojs.using('oojs.event');
var func1 = function(data){
    //console.log(data);
};
var func2= function(data){
    //console.log(data);
};
var func3 = function(data){
    //console.log(data);
};
var func4 = function(data){
    //console.log(data);
};

// add tests
suite
    .add('oojs.create', {
        fn: function() {
            var ev = oojs.create(oojsEvent);
            ev.bind('event1', func1);
            ev.bind('event1', func2);
            ev.bind('event1', func3);
            ev.bind('event1', func4);
            ev.bind('event2', func1);
            ev.bind('event3', func1);
            ev.bind('event4', func1);

            ev.emit('event1', 'event1-data-1');
            ev.emit('event1', 'event1-data-2');
            ev.emit('event1', 'event1-data-3');
            ev.emit('event2', [1,2,3]);
            ev.emit('event3', 'event3-data');
            ev.emit('event4', 'event4-data');
			
        }
    })
    .on('cycle', function (event) {
        console.log(String(event.target));
    })
    .on('complete', function () {
        console.log('Fastest is ' + this.filter('fastest').pluck('name'));
    })
    .run({'async': true});