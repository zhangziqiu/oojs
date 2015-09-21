require('../src/oojs.js');
var Benchmark = require('benchmark');
var suite = new Benchmark.Suite('foo');

oojs.define({
    name:'test1'
});
var oojsClass = oojs.using('test1');

var funcClass = function(){
};
funcClass.prototype = {
    name:'test1'
};

// add tests
suite
    //.add('new Function', {
    //   fn: function() {
    //       var obj = new funcClass();
    //   }
    //})
    .add('oojs.create', {
        fn: function() {
            var obj = oojs.create(oojsClass);
        }
    })
    .on('cycle', function (event) {
        console.log(String(event.target));
    })
    .on('complete', function () {
        console.log('Fastest is ' + this.filter('fastest').pluck('name'));
    })
    .run({'async': true});