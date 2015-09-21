var assert = require("assert");
require('../../src/oojs.js');

describe('oojs.core', function () {
    describe('#define()', function () {
        it('check define(class)', function () {
            oojs.define({
                name: 'testDepsClass',
                $testDepsClass: function () {
                    this.staticProperty = 'testDepsClass-static-property-value';
                }
            });

            oojs.define({
                name: 'testClass',
                deps: {
                    testDepsClass:'testDepsClass'
                },
                $testClass: function () {
                    this.staticProperty = 'testClass-static-property-value';
                }
            });

			var testDepsClass = oojs.using('testDepsClass');
            var testClass = oojs.using('testClass');
            assert.equal(testDepsClass.staticProperty, 'testDepsClass-static-property-value');
			assert.equal(testClass.staticProperty, 'testClass-static-property-value');
			assert.equal(testClass.testDepsClass.staticProperty, 'testDepsClass-static-property-value');
        });

        it('check class.__name', function () {
            var testClass = oojs.using('testClass');
            assert.equal(testClass.__name, 'testClass');
        });

        it('check class.__namespace', function () {
            var testClass = oojs.using('testClass');
            assert.equal(testClass.__namespace, '');
        });

        it('check class.__registed', function () {
            var testClass = oojs.using('testClass');
            assert.equal(testClass.__registed, true);
        });

        it('check class.__clones', function () {
            oojs.define({
                name: 'depsClass'
            });

            oojs.define({
                name: 'cloneTestClass',
                p1: {
                    p1name: 'p1.p1name-value'
                },
                p2: true,
                p3: [],
                p4: new Date(),
                p5: 'stringKey',
                deps:{
                    depsClass:'depsClass'
                }
            });

            var cloneTestClass = oojs.using('cloneTestClass');
            assert.deepEqual(cloneTestClass.__clones, ['p1', 'p3', 'p4']);
        });

        it('check class.__staticSource', function () {
            var testClass = oojs.using('testClass');
            assert.equal(testClass.$testClass, testClass.__staticSource);
        });

        it('check class.__constructor', function () {
            var testClass = oojs.using('testClass');
            assert.ok(typeof testClass.__constructor === 'function');
        });

        it('check multi-define a class', function () {
			oojs.define({
                name: 'testMultiDefineClass',
                $testMultiDefineClass: function () {
                    this.staticProperty = 'static-property-value';
                }
            });
		
            oojs.define({
                name: 'testMultiDefineClass',
                $testMultiDefineClass: function () {
                    this.staticProperty = 'static-property-value-changed';
                },
                testMultiDefineClass: function () {
                    this.instanceProperty = 'instance-property-value';
                }
            });

            var testClass = oojs.using('testMultiDefineClass');
            // 静态构造函数不能被修改
            assert.equal(testClass.staticProperty, 'static-property-value');
            // 动态构造函数之前没定义使用的是空白函数的默认值，本次定义应该被修改
            assert.ok(testClass.__constructorSource.toString().indexOf('instance-property-value') > 0);

        });		
		
		it('bug case: change prototype property in dynamic constructor', function () {
			oojs.define({
				name: 'testDynamicPrototype',
				config: { name:'config-name-value'},
				testDynamicPrototype: function (name) {
					this.config.name = name;
				}
			});		
			var testClass = oojs.using('testDynamicPrototype');
			var testImp1 = oojs.create('testDynamicPrototype', 'test-1');
			var testImp2 = oojs.create('testDynamicPrototype', 'test-2');
			
			assert.equal(testClass.config.name, 'config-name-value');
			assert.equal(testImp1.config.name, 'test-1');
			assert.equal(testImp2.config.name, 'test-2');
			
        });
    });

    describe('#create()', function () {
        it('check create a class instance', function () {
            oojs.define({
                name: 'createTestClass',
                $createTestClass: function () {
                    this.staticProperty = 'static-property-value';
                },
				createTestClass: function () {
                    this.instanceProperty = 'instance-property-value';
                }
            });
		
            var classImp = oojs.create('createTestClass');
            assert.equal(classImp.name, 'createTestClass');
            assert.equal(classImp.staticProperty, 'static-property-value');
            assert.equal(classImp.instanceProperty, 'instance-property-value');
            assert.ok(classImp.hasOwnProperty('staticProperty') === false);
            assert.ok(classImp.hasOwnProperty('instanceProperty') === true);
        });

        it('check clone property', function () {
            oojs.define({
                name: 'clonePropertyTest',
                p1: {
                    p1name: 'p1.p1name-value'
                },
                p2: true,
                p3: [],
                p4: new Date(),
                p5: 'stringKey'
            });

            var clonePropertyTestClass = oojs.using('clonePropertyTest');
            var classImp = oojs.create(clonePropertyTestClass);

            // p1应该是需要克隆的属性
            assert.ok(classImp.hasOwnProperty('p1') === true);
            // p1.p1name属性值应该被正确的克隆
            assert.equal(classImp.p1.p1name, 'p1.p1name-value');
            // 修改 p1.p1name, 应该只会修改实例的属性，类定义应该不变。
            classImp.p1.p1name = 'p1.p1name-value-changed';
            assert.equal(clonePropertyTestClass.p1.p1name, 'p1.p1name-value');
            assert.ok(classImp.hasOwnProperty('p3') === true);
            assert.ok(classImp.hasOwnProperty('p4') === true);
        });
    });
});