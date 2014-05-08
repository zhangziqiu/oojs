
(function () {
    /**
     *   oojs核心, 提供面向对象编程方式.
     **/
    var oojs = {
        name: "oojs",
        namespace: "",
        /**
         * 静态构造函数
         */
        $oojs: function () {
            //为Function对象添加proxy函数
            Function.prototype.proxy = function (context) {
                var method = this;
                var args = Array.prototype.slice.apply(arguments);
                var obj = args.shift();
                return function () {
                    var tempArgs = Array.prototype.slice.apply(arguments);
                    return method.apply(obj, tempArgs.concat(args));
                }
            }

            if (typeof window !== 'undefined') {
                this.global = window;
                this.runtime = 'browser';
                this.basePath = 'http://cpro.baidustatic.cn/js/';
                this.version = '1.0.0';
                this.global.oojs = oojs;
                this.global.define = this.define.proxy(this);
            }
            else if (global) {
                this.basePath = __dirname + "/";
                this.global = global;
                this.runtime = 'nodejs';
                global.oojs = oojs;
                global.define = this.define.proxy(this);
                //hack nodejs
                var Module = module.constructor;
                var nativeWrap = Module.wrap;
                Module.wrap = function (script) {
                    script = script.replace(/define\s*&&\s*define\s*\(/gi, 'define(module,');
                    return nativeWrap(script);
                };
                module.exports = this;
            }

        },

        /**
         * 快速克隆方法
         * @public
         * @method fastClone
         * @param {Object} source 带克隆的对象. 使用此方法克隆出来的对象, 如果source对象被修改, 则所有克隆对象也会被修改
         * @return {Object} 克隆出来的对象.
         */
        fastClone: function (source) {
            var temp = function () {};
            temp.prototype = source;
            var result = new temp();
        },

        /**
         * 创建一个类实例.  var a = oojs.create(classA, 'a');
         * @public
         * @method create
         * @param {Object} classObj 类对象
         * @param {params} 动态构造函数的参数
         * @return {Object} 类实例
         */
        create: function (classObj, params) {
            var args = Array.prototype.slice.call(arguments, 0);
            args.shift();
            //构造函数
            var constructerName = classObj.name || "init";

            var tempClassObj = function (args) {
                    this[constructerName] = this[constructerName] || function () {};
                    this[constructerName].apply(this, args);
                };

            tempClassObj.prototype = classObj;
            var result = new tempClassObj(args);
            //web页面在unload时触发析构函数
            result.dispose = result.dispose || function () {};
            if (this.runtime === 'browser') {
                // 事件监听器挂载
                if (window.addEventListener) {
                    window.addEventListener("unload", result.dispose.proxy(result), false);
                }
                else if (window.attachEvent) {
                    window.attachEvent('onunload', result.dispose.proxy(result));
                }
            }


            //如果类的某一个属性是对象,并且是纯数据对象(继承自Object), 则需要克隆
            for (var classPropertyName in classObj) {
                if (result[classPropertyName] && classObj[classPropertyName] && classObj.hasOwnProperty(classPropertyName) && typeof result[classPropertyName] === "object") {
                    result[classPropertyName] = this.fastClone(result[classPropertyName]);
                }
            }

            result.instances = null;
            //todo 类上记录所有类实例的引用, 以便进行垃圾回收
            //classObj.instances = classObj.instances || [];
            //classObj.instances.push(result);
            return result;
        },

        /**
         * 定义一个类. 第一个参数module在node中由系统自动传递. 即开发人员只需要传递一个参数classObj
         * @public
         * @param {Object} module node模式中的module对象
         * @param {Object} classObj 类对象
         * @return {Object} oojs引用
         */
        define: function (module, classObj) {
            if (!classObj) {
                classObj = module;
            }

            var name = classObj.name;
            classObj.namespace = classObj.namespace || "";
            classObj.dispose = classObj.dispose || function () {};

            var preNamespaces = classObj.namespace.split('.');
            var runtime = 'nodejs';
            if (typeof window !== 'undefined') {
                global = window;
                runtime = 'browser';
            }

            //初始化前置命名空间
            var count = preNamespaces.length;
            var currClassObj = global;
            var firstName, tempName;
            for (var i = 0; i < count; i++) {
                tempName = preNamespaces[i];
                if (tempName) {
                    currClassObj[tempName] = currClassObj[tempName] || {};
                    currClassObj = currClassObj[tempName];
                }
            }

            //注册当前类
            currClassObj[name] = currClassObj[name] || {};

            //新注册类
            if (!currClassObj[name].name || !currClassObj[name].___registered) {
                classObj.___registered = true;
                currClassObj[name] = classObj;
            }
            //分布类的实现
            else if (currClassObj[name].___registered && classObj.classType && classObj.classType === 'extend') {
                for (var key in classObj) {
                    if (key && classObj.hasOwnProperty(key)) {
                        currClassObj[name][key] = classObj[key];
                    }
                }
                classObj = currClassObj[name];
            }

            //加载依赖. 预留钩子
            if (this.loadDeps && classObj && classObj.deps) {
                this.loadDeps(classObj);
            }
            else {
                //执行静态构造函数
                var staticConstructorName = "$" + name;
                classObj[staticConstructorName] && classObj[staticConstructorName]();
            }

            if (module) {
                module.exports = classObj;
            }

            return this;
        },

        /**
         * 从全局对象上, 根据命名空间查找类对象
         * @public
         * @param {string} name 类的全限定性名(命名空间+类名, 比如 a.b.c)
         * @return {Object} 类引用
         */
        find: function (name) {
            var result;
            var nameArray = name.split(".");
            result = this.global[nameArray[0]];
            for (var i = 1, count = nameArray.length; i < count; i++) {
                if (result && result[nameArray[i]]) {
                    result = result[nameArray[i]];
                }
                else {
                    result = null;
                    break;
                }
            }
            return result;
        },

        /**
         * 获取类引用. 在node模式下回加载类. 在browser模式下只是执行find查找.
         * @public
         * @param {string} name 类的全限定性名(命名空间+类名, 比如 a.b.c)
         * @return {Object} 类引用
         */
        using: function (name) {
            var result = this.find(name);
            if (!result) {
                //加载模块文件, 仅限node模式. node模式属于本地存储, 相当于所有文件已经加载完毕.
                //在browser模式下, 应该在入口对象的deps中指定main函数需要的依赖模块.
                if (this.runtime === 'nodejs') {
                    require(this.getClassPath(name));
                    result = this.find(name);
                }
            }
            return result;
        },

        /**
         * 获取类的资源文件相对路径
         * @public
         * @param {string} name 类的全限定性名(命名空间+类名, 比如 a.b.c)
         * @return {string} 资源文件的相对路径(比如 /a/b/c.js)
         */
        getClassPath: function (name) {
            return this.basePath + name.replace(/\./gi, "/") + ".js";
        },

        /**
         * oojs配置函数.
         * @public
         * @param {object} option 配置文件对象
         * @param {string} option.basePath 根目录地址.
         * @return {object} oojs对象引用
         */
        config: function (option) {
            this.basePath = option.basePath || this.basePath;
            return this;
        }
    };

    //自解析
    oojs.define(typeof module !== 'undefined' ? module : null, oojs);

})();