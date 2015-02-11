require('node-oojs');

define && define({
    name: 'testLoadDeps',
    testCase: [{
        description: 'class-b then class-a',
        testCase: function () {
            oojs.define({
                name: 'b',
                deps: {
                    c: 'c'
                },
                $b: function () {
                    console.log("class-b-loaded");
                    console.log("b.c:");
                    console.log(this.c);
                }
            });

            oojs.define({
                name: 'c',
                deps: {},
                $c: function () {
                    console.log("class-c-loaded");
                    var classB = oojs.using('oojs.core.test.b');
                    console.log('b.c:');
                    console.log(classB.c);
                }
            });

            var b = oojs.using('b');
            var c = oojs.using('c');

            var assert = require('assert');
            assert.ok(b.c);
            assert.ok(!b.c);
        }
    }, {
        description: 'test 2',
        testCase: function () {
            assert.ok(true);
        }
    }]
})


oojs.using(testLoadDeps).testCase[0].testCase();