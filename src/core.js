(function () {
    var oojs = {
        name: "oojs",
        namespace: "",
        basePath: "./",
        //静态构造函数
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
			
			if( typeof define !== 'undefined' &&  define instanceof Array ){
				var defineArray = define;				
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
                this.basePath = __dirname + "\\";
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
			
			if( defineArray && defineArray.length ){
				var classObj;
				for(var i=0, count=defineArray.length; i<count; i++){
					classObj = defineArray[i];
					define( typeof module !== 'undefined'? module : classObj);
				}
			}
        },

        //用于处理无法遍历Date等对象的问题
        buildInObject: {
            '[object Function]': 1,
            '[object RegExp]': 1,
            '[object Date]': 1,
            '[object Error]': 1,
            '[object Window]': 1
        },

        /**
        快速克隆方法
        @public
        @method fastClone
        @param {Object} source 带克隆的对象. 使用此方法克隆出来的对象, 如果source对象被修改, 则所有克隆对象也会被修改
        @return {Object} 克隆出来的对象.
        **/
        clone: function (source, depth) {
            var result = source,
                i, len;

            depth = typeof depth === "undefined" ? 0 : depth--;

            if (!source || source instanceof Number || source instanceof String || source instanceof Boolean || depth === 0) {
                return result;
            }
            else if (source instanceof Array) {
                result = [];
                var resultLen = 0;
                for (i = 0, len = source.length; i < len; i++) {
                    result[resultLen++] = this.clone(source[i]);
                }
            }
            else if ('object' === typeof source) {
                if (this.buildInObject[Object.prototype.toString.call(source)]) {
                    return result;
                }
                result = {};
                for (i in source) {
                    if (source.hasOwnProperty(i)) {
                        result[i] = this.clone(source[i]);
                    }
                }
            }
            return result;
        },

        create: function (classObj, params) {
            var args = Array.prototype.slice.call(arguments, 0);
            args.shift();
            //构造函数
            var constructerName = classObj.name || "init";

            var tempClassObj = function (args) {
                    this[constructerName] = this[constructerName] || function () {};
				   
                    this[constructerName].apply(this, args);
                    //web页面在unload时触发析构函数
                    if (this.runtime === 'browser') {
                        // 事件监听器挂载
                        if (window.addEventListener) {
                            window.addEventListener("unload", this.dispose, false);
                        }
                        else if (window.attachEvent) {
                            window.attachEvent('onunload', this.dispose);
                        }
                    }
                };

            tempClassObj.prototype = classObj;
            var result = new tempClassObj(args);
            //如果类的某一个属性是对象, 则需要克隆
            for (var classPropertyName in classObj) {
                if (result[classPropertyName] && classObj[classPropertyName] && classObj.hasOwnProperty(classPropertyName) && typeof result[classPropertyName] === "object") {
                    result[classPropertyName] = this.clone(result[classPropertyName], 1);
                }
            }
            result.instances = null;
            //类上记录所有类实例的引用
            classObj.instances = classObj.instances || [];
            classObj.instances.push(result);
            return result;
        },

        define: function (module, classObj) {
            if( !classObj ){
                classObj = module;
            }
            
            var name = classObj.name;			
			classObj.namespace = classObj.namespace || "";
			classObj.dispose = classObj.dispose || function(){};
			
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
        },

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

        getClassPath: function (fullName) {
            return this.basePath + fullName.replace(/\./gi, "/") + ".js";
        },
        config: function (option) {
            this.basePath = option.basePath || this.basePath;
        }
    };

    //自解析
    oojs.define( typeof module !== 'undefined'?module:null, oojs);

})();
