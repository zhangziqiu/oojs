require('../../src/oojs.js');
//require('../../bin/old.js');

var Benchmark = require('benchmark');
var suite = new Benchmark.Suite('create');
var events = require('events');
var oojsEvent = oojs.using('oojs.event');

// add tests
suite
    .add('oojs.define', {
        fn: function() {		
			oojs.define({
				name:'test',
				namespace:'my.project',
				$test:function(){
					this.myName2 = 'name2';
				},
				test:function(){
					this.myName3 = 'name3';
				}
			});
			oojs.classes = {};
        }
    })
    .on('cycle', function (event) {
        console.log(String(event.target));
    })
    .on('complete', function () {
        console.log('Fastest is ' + this.filter('fastest').pluck('name'));
    })
    .run({'async': true});