var assert = require("assert");
require('../../src/oojs.js');
var old = oojs;

describe('oojs.core.browser', function () {
    describe('#define()', function () {
        it('simulate browser load', function () {
            //清空环境内的oojs引用
            global.oojs = null;
            delete require.cache[require.resolve('../../src/oojs.js')];
            global.window = global;
            global.document = {};
            global.$oojs_config = { proxyName : false };
            require('../../src/oojs.js');
            assert.equal(oojs.runtime, 'browser');
        });

        it('reload', function () {
            var reloadClass = oojs.define({
                name: 'reloadTestClass',
                namespace: 'test.unit.data',
                myValue: 1
            });
            oojs.reload('test.unit.data.reloadTestClass');
            assert.equal(reloadClass.myValue, 1);
        });

        it('loader', function () {
            // mock loader
            oojs.loader = {
                loadDepsBrowser: function(classObj, unloadClass){
                    // 依赖类
                    oojs.define({
                        name: 'loaderTestDepClass',
                        namespace: 'test.unit.data'
                    });

                    oojs.reload(classObj.__full);
                }
            };

            var loaderTestClass = oojs.define({
                name: 'loaderTestClass',
                namespace: 'test.unit.data',
                deps:{
                    depClass: 'test.unit.data.loaderTestDepClass'
                }
            });

            assert.equal(loaderTestClass.depClass.name, 'loaderTestDepClass');
        });

        it('recovery oojs', function () {
            global.oojs = old;
            assert.equal(oojs.runtime, old.runtime);
        });
    });

});