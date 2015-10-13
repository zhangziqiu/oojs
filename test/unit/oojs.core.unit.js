var assert = require("assert");
//oojs初始化时的配置变量。必须在oojs加载前载入
global.$oojs_config = { proxyName : 'proxy' };
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
                p3: [1,2,3],
                p4: new Date(),
                p5: 'stringKey',
                deps:{
                    depsClass:'depsClass'
                }
            });

            var cloneTestClass = oojs.using('cloneTestClass');
            assert.deepEqual(cloneTestClass.__clones, ['p1', 'p3', 'p4']);
        });

        it('define anonymous class', function () {
            var testClass = oojs.define({
                myName: 'anonymousClass'
            });
            assert.equal(testClass.myName, 'anonymousClass');
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

    describe('#using()', function () {
        it('using', function () {
            oojs.setPath({
                'test':process.cwd()
            });

            var usingClassA = oojs.using('test.unit.data.usingClassA');
            assert.equal(usingClassA.name, 'usingClassA');
        });
    });

    describe('#deepClone()', function () {
        it('deepClone', function () {
            //deepClone 最多克隆深度为10层.超过10层的对象直接返回不进行克隆
            var max = {
                a1:{
                    a2:{
                        a3:{
                            a4:{
                                a5:{
                                    a6:{
                                        a7:{
                                            a8:{
                                              a9:{
                                                  a10:{
                                                      a11:{
                                                          myValue:11
                                                      }
                                                  }
                                              }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            };

            var cloned1 = oojs.deepClone(max);
            var cloned2 = oojs.deepClone(max);
            var cloned3 = oojs.deepClone(max);
            assert.equal(cloned1.a1.a2.a3.a4.a5.a6.a7.a8.a9.a10.a11.myValue, 11);
            assert.equal(cloned2.a1.a2.a3.a4.a5.a6.a7.a8.a9.a10.a11.myValue, 11);
            assert.equal(cloned3.a1.a2.a3.a4.a5.a6.a7.a8.a9.a10.a11.myValue, 11);
            // 第10层对象应该克隆,clone1的修改不影响clone2
            cloned1.a1.a2.a3.a4.a5.a6.a7.a8.a9.a10 = 'a10-changed';
            assert.equal(cloned1.a1.a2.a3.a4.a5.a6.a7.a8.a9.a10, 'a10-changed');
            assert.equal(cloned2.a1.a2.a3.a4.a5.a6.a7.a8.a9.a10.a11.myValue, 11);
            // 第11层对象不克隆,clone12的修改会影响clone3
            cloned2.a1.a2.a3.a4.a5.a6.a7.a8.a9.a10.a11 = 'a11-changed';
            assert.equal(cloned2.a1.a2.a3.a4.a5.a6.a7.a8.a9.a10.a11, 'a11-changed');
            assert.equal(cloned3.a1.a2.a3.a4.a5.a6.a7.a8.a9.a10.a11, 'a11-changed');
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
                p3: [1,2,3],
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
	
	describe('#other()', function () {
		it('fastClone', function () {			
			var sourceObj = {
				p1: 'p1Value'
			};
			
			var cloneObj = oojs.fastClone(sourceObj);			
			assert.equal(cloneObj.p1, sourceObj.p1);
			cloneObj.p1 = 'p1ValueChanged';
			assert.equal(cloneObj.p1, 'p1ValueChanged');
			assert.equal(sourceObj.p1, 'p1Value');	
        });

		
		it('setPath, getPath, getClassPath', function () {
			oojs.setPath('a.b', 'http://a-b-base');
			oojs.setPath({'a.b.c':'http://a-b-c'});
			oojs.setPath('a.b.d', 'http://a-b-d');

            var pathRoot = oojs.getPath();
			var path1 = oojs.getPath('a.b');
			var path2 = oojs.getPath('a.b.c');
			var path3 = oojs.getPath('a.b.d');
			var path4 = oojs.getClassPath('a.b.e');

            var path = require('path');
            assert.equal(path.resolve(pathRoot), path.resolve(process.cwd()+'/src/'));
			assert.equal(path1, 'http://a-b-base');
			assert.equal(path2, 'http://a-b-c');
			assert.equal(path3, 'http://a-b-d');
			assert.equal(path4, 'http://a-b-base/a/b/e.js');			
        });
		
		it('proxy-1', function (done) {
			var test = {
				name: 'testName',
				say: function(p1, p2){
					done();
					assert.equal(this.name, 'testName');
					assert.equal(p1, 'p1Value');
					assert.equal(p2, 'p2Value');
                    assert.equal(p3, 'p3Value');
                    assert.equal(p4, 'p4Value');
                    assert.equal(p5, 'p5Value');

				}
			};
			var p1 = 'p1Value';
			var p2 = 'p2Value';
            var p3 = 'p3Value';
            var p4 = 'p4Value';
            var p5 = 'p5Value';
			
			var testProxyFunction = oojs.proxy(test, test.say, p1, p2, p3, p4, p5);
			setTimeout(function(){
				testProxyFunction(p1, p2, p3, p4, p5);
			}, 100);			
        });
		
		it('proxy-2', function (done) {
			var test = {
				name: 'testName',
				say: function(p1, p2){
					done();
					assert.equal(this.name, 'testName');
					assert.equal(p1, 'p1Value');
					assert.equal(p2, 'p2Value');
				}
			};
			test.say.proxy = oojs.proxy;
			var p1 = 'p1Value';
			var p2 = 'p2Value';
			
			var testProxyFunction = test.say.proxy(this, p1, p2);			
			setTimeout(function(){
				testProxyFunction(p1, p2);
			}, 100);			
        });

        it('reload-1', function () {
            var reloadClass = oojs.define({
                name: 'reloadTestClass',
                namespace: 'test.unit.data',
                myValue: 1
            });
            oojs.setPath({
                'test':process.cwd()
            });
            assert.equal(reloadClass.myValue, 1);
            oojs.reload('test.unit.data.reloadTestClass');
            reloadClass = oojs.using('test.unit.data.reloadTestClass');
            assert.equal(reloadClass.myValue, 2);
        });

        it('reload-2', function () {
            reloadClass = oojs.reload('test.unit.data.reloadTestClass2');
            assert.equal(reloadClass.name, 'reloadTestClass2');
        });
		
	});

    describe('#bugfix()', function () {
        it('multi-define from file', function () {
            var multiDefineClass = oojs.define({
                name: 'multiDefineClass',
                namespace: 'test.unit.data',
                myValue: 1
            });
            oojs.setPath({
                'test':process.cwd()
            });
            assert.equal(multiDefineClass.myValue, 1);
            require(process.cwd() + '/test/unit/data/multiDefineClass.js');
            multiDefineClass = oojs.using('test.unit.data.multiDefineClass');
            assert.equal(multiDefineClass.myValue, 1);
        });
    });

    describe('#loadDeps()', function () {
        it('loadDeps', function () {
            // 测试三种情况:
            // nodeFs: node模块, 使用require加载
            // classB: 预先define完毕, 使用oojs的全限定性名加载. classB依赖ClassE
            // classC: 未define, 从磁盘上加载.
            // classD: 预先define完毕, 直接传递类引用

            oojs.setPath({
                'test':process.cwd()
            });

            // 预先定义好ClassB 和 ClassD
            oojs.define({
                name: 'loadDepsClassB',
                namespace: 'test.unit.data',
                deps: {
                    classE: 'test.unit.data.loadDepsClassE'
                }
            });

            var loadDepsClassD = oojs.define({
                name: 'loadDepsClassD',
                namespace: 'test.unit.data'
            });

            // 定义ClassA, 加载依赖
            var multiDefineClass = oojs.define({
                name: 'loadDepsClassA',
                namespace: 'test.unit.data',
                deps: {
                    nodeFs : require('fs'),
                    classB : 'test.unit.data.loadDepsClassB',
                    classC : 'test.unit.data.loadDepsClassC',
                    classD : loadDepsClassD
                }
            });

            // 检查依赖项是否都加载完成
            assert.ok(!!multiDefineClass.nodeFs);
            assert.ok(!!multiDefineClass.classB);
            assert.ok(multiDefineClass.classB.name === 'loadDepsClassB');
            assert.ok(!!multiDefineClass.classC);
            assert.ok(multiDefineClass.classC.name === 'loadDepsClassC');
            assert.ok(!!multiDefineClass.classD);
            assert.ok(multiDefineClass.classD.name === 'loadDepsClassD');
            assert.ok(!!multiDefineClass.classB.classE);
            assert.ok(multiDefineClass.classB.classE.name === 'loadDepsClassE');

        });

        it('nodejs: can not find file', function (done) {
            // 测试node模式下, 类文件无法找到的情况.
            try {
                oojs.define({
                    name: 'noFindClass',
                    namespace: 'test.unit.data',
                    deps: {
                        classUnload: 'can.not.find.class'
                    }
                });
            }
            catch(ex){
                done();
            }


        });
    });
});