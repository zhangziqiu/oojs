(function() {
    /**
     * oojs核心, 提供面向对象编程方式.
     **/
    var oojs = {
        /**
        类名
         */
        name: "oojs",
        /**
        类的命名空间
         */
        namespace: "",
        /**
        类对象都注册到oojs.classes属性上
         */
        classes: {},
        /**
        静态构造函数
         */
        $oojs: function(config) {
            //根据不同的运行环境, 设置默认值
            config = config || {};
            //判断是window还是node环境
            //设置全局作用域, 默认浏览器模式为window, node模式为系统global变量. 会在全局作用域中添加oojs变量.
            if (typeof window !== "undefined" && typeof document !== "undefined") {
                this.runtime = "browser";
                config.global = window;
            } else {
                this.runtime = "node";
                config.global = global;
            }
            //为Function原型添加的proxy函数的函数名. false表示不添加. 默认为'proxy'. 可以使用oojs.proxy替代
            config.proxyName = "proxy";
            //设置代码库根目录. node模式使用文件路径(可以是相对路径), 浏览器模式下需要提供完整的url地址.
            config.path = this.runtime === "node" ? process.cwd() + "/src/" : "/src/";
            //从可访问的 $oojs_config 变量中获取用户定义的配置项
            if (typeof $oojs_config !== "undefined") {
                for (var key in $oojs_config) {
                    if (key && $oojs_config.hasOwnProperty(key)) {
                        config[key] = $oojs_config[key];
                    }
                }
            }
            //根据config配置项进行初始化
            this.global = config.global || {};
            if (config.proxyName) {
                Function.prototype[config.proxyName] = this.proxy;
            }
            this.setPath(config.path);
            this.global.oojs = this.global.oojs || this;
        },
        /**
        存储命名空间的目录树
        */
        path: {},
        /**
        缓存命名空间的路径
        */
        pathCache: {},
        /**
         * 从目录树中, 返回指定命名空间的目录
         * @param {string} namespace 命名空间, 比如"A.B.C"
         * @return {string} 路径
         */
        getPath: function(namespace) {
            //namespace: a.b.c
            //path: http://www.123.com/a/b or /home/user/a/b            
            var namespaceArray = namespace ? namespace.split(".") : false;
            var node = this.path;
            if (namespaceArray) {
                for (var i = 0, count = namespaceArray.length; i < count; i++) {
                    var currentName = namespaceArray[i].toLowerCase();
                    if (node[currentName]) {
                        node = node[currentName];
                    } else {
                        break;
                    }
                }
            }
            return node._path;
        },
        /**
         * 设置命名空间的目录:
         *      只设置一个根路径:       oojs.setPath('/root/');
         *      为特定命名空间设置路径: oojs.setPath('a.b.c','/root/myproject/');  
         *      为多个命名空间设置路径: oojs.setPath({'a':'/root/projectA', 'b':'/root/projectB'});  
         * @public
         * @param {string} namespace 命名空间, 比如"A.B.C"
         * @param {string} path 路径
         */
        setPath: function(namespace, path) {
            var node = this.path;
            if (typeof namespace === "object") {
                //多个命名空间设置路径: oojs.setPath({'a':'/root/projectA', 'b':'/root/projectB'});  
                for (var key in namespace) {
                    if (key && namespace.hasOwnProperty(key)) {
                        this.setPath(key, namespace[key]);
                    }
                }
                return;
            } else if (!path) {
                //只设置一个根路径: oojs.setPath('/root/');
                path = namespace;
            } else {
                //为特定命名空间设置路径: oojs.setPath('a.b.c','/root/myproject/');  
                var namespaceArray = namespace.split(".");
                for (var i = 0, count = namespaceArray.length; i < count; i++) {
                    var currentName = namespaceArray[i].toLowerCase();
                    node[currentName] = node[currentName] || {
                        _path: node._path
                    };
                    node = node[currentName];
                }
            }
            //为路径添加末尾的斜杠
            if (path && path.lastIndexOf("\\") !== path.length - 1 && path.lastIndexOf("/") !== path.length - 1) {
                path = path + "/";
            }
            node._path = path;
        },
        /**
         * 获取类的资源文件相对路径
         * @public
         * @param {string} name 类的全限定性名(命名空间+类名, 比如 a.b.c)
         * @return {string} 资源文件的相对路径(比如 /a/b/c.js)
         */
        getClassPath: function(name) {
            if (!this.pathCache[name]) {
                this.pathCache[name] = this.getPath(name) + name.replace(/\./gi, "/") + ".js";
            }
            return this.pathCache[name];
        },
        /**
         * 加载依赖
         * @public
         * @param {Object} classObj 类对象
         * @return {Object} recording 递归加载时, 用于记录一个类的加载状态
         */
        loadDeps: function(classObj, recording) {
            recording = recording || {};
            var deps = classObj.deps;
            var unloadClassArray = [];
            for (var key in deps) {
                if (key && deps.hasOwnProperty(key) && deps[key]) {
                    var classFullName;
                    //如果key对应的是一个非string, 比如一个object, 则表示已经加载完依赖
                    if (typeof deps[key] !== "string") {
                        classObj[key] = deps[key];
                        if (classObj[key] && classObj[key].name) {
                            classObj[key].namespace = classObj[key].namespace || "";
                            classFullName = classObj[key].namespace + classObj[key].name;
                        }
                    } else {
                        //如果key是string, 表示传递的是oojs的命名空间
                        classFullName = deps[key];
                        classObj[key] = this.find(classFullName);
                    }
                    //两种情况下跳过依赖加载. 
                    //1.已经被加载过, 即已经在recording中存在
                    //2.没有找到classFullName. 即模块是node模块而非oojs模块
                    if (!classFullName || recording[classFullName]) {
                        continue;
                    }
                    recording[classFullName] = true;
                    if (!classObj[key]) {
                        //node模式下, 发现未加载的依赖类, 尝试使用require加载
                        if (this.runtime === "node") {
                            classObj[key] = require(this.getClassPath(classFullName));
                            if (!classObj[key]) {
                                //node模式下, 如果依赖类无法加载则报错
                                throw new Error(classObj.name + " loadDeps failed: " + classFullName);
                            }
                        }
                        if (!classObj[key]) {
                            unloadClassArray.push(classFullName);
                        }
                    } else {
                        if (classObj[key].deps) {
                            unloadClassArray = unloadClassArray.concat(this.loadDeps(classObj[key], recording));
                        }
                    }
                }
            }
            return unloadClassArray;
        },
        /**
         * 快速克隆方法
         * @public
         * @method fastClone
         * @param {Object} source 带克隆的对象. 使用此方法克隆出来的对象, 如果source对象被修改, 则所有克隆对象也会被修改
         * @return {Object} 克隆出来的对象.
         */
        fastClone: function(source) {
            var temp = function() {};
            temp.prototype = source;
            var result = new temp();
            return result;
        },
        /**
         * 代理类函数, 用于修改函数中的this. 使用proxy函数后返回一个函数, 里面的this指针会被修改为context参数传递过来的对象.
         * @public
         * @method proxy
         * @param {Object} context 使用此对象替换函数的this指针.
         * @param {Function} method 需要替换this指针的函数.如果是通过函数原型的方式调用的, 则不需要此参数.
         * @return {Function} this指针被修改的函数
         */
        proxy: function(context, method) {
            var thisArgs = Array.prototype.slice.apply(arguments);
            var thisObj = thisArgs.shift();
            var thisMethod = typeof this === "function" ? this : thisArgs.shift();
            return function() {
                var tempArgs = Array.prototype.slice.apply(arguments);
                return thisMethod.apply(thisObj, tempArgs.concat(thisArgs));
            };
        },
        /**
         * oojs设置函数. 如果设置了
         * @public
         * @param {Object} config 配置文件的mapping对象
         */
        config: function(config) {
            for (var key in obj) {
                if (key && obj.hasOwnProperty(key)) {
                    if (key === "path" || key === "basePath") {
                        this.setPath(obj[key]);
                    }
                }
            }
        },
        /**
         * 创建一个类实例.  var a = oojs.create(classA, 'a');
         * @public
         * @method create
         * @param {Object} classObj 类对象
         * @param {params} 动态构造函数的参数
         * @return {Object} 类实例
         */
        create: function(classObj, params) {
            var args = Array.prototype.slice.call(arguments, 0);
            args.shift();
            //classObj如果是字符串, 则尝试使用using加载类.
            if (typeof classObj === "string") {
                classObj = this.using(classObj);
            }
            if (!classObj || !classObj.name) {
                throw new Error("oojs.create need a class object with a name property");
            }
            //构造函数
            var constructerName = "__" + classObj.name || "init";
            var tempClassObj = function() {};
            tempClassObj.prototype = classObj;
            var result = new tempClassObj();
            //如果类的某一个属性是对象,则需要克隆
            for (var classPropertyName in classObj) {
                var temp = classObj[classPropertyName];
                if (temp && classObj.hasOwnProperty(classPropertyName) && typeof temp === "object") {
                    //经测试, fastClone方法对于Array类型也适用
                    result[classPropertyName] = this.fastClone(temp);
                }
            }
            //复制完属性后, 再执行构造函数. 防止构造函数中修改原型类.
            result[constructerName] = result[constructerName] || function() {};
            result[constructerName].apply(result, args);
            result.instances = null;
            //todo 类上记录所有类实例的引用, 以便进行垃圾回收
            //classObj.instances = classObj.instances || [];
            //classObj.instances.push(result);
            return result;
        },
        /**
         * 定义一个类. 
         * @public         
         * @param {Object} classObj 类对象
         * @return {Object} oojs引用
         */
        define: function(classObj) {
            var name = classObj.name;
            var staticConstructorName = "$" + name;
            classObj.namespace = classObj.namespace || "";
            classObj.dispose = classObj.dispose || function() {};
            //将动态构造函数改名为"__类名"的形式, 防止程序编程时导致的变量名冲突
            classObj["__" + name] = classObj[name] || function() {};
            var isRegisted = false;
            //是否已经被注册过            
            var isPartClass = false;
            //是否是分部类, 默认不是分部类
            //初始化前置命名空间
            var preNamespaces = classObj.namespace.split(".");
            var count = preNamespaces.length;
            var currClassObj = this.classes;
            var firstName, tempName;
            for (var i = 0; i < count; i++) {
                tempName = preNamespaces[i];
                if (tempName) {
                    currClassObj[tempName] = currClassObj[tempName] || {};
                    currClassObj = currClassObj[tempName];
                }
            }
            //此时 currClassObj 是当前待注册类所属的命名空间对象. 通过 currClassObj[name] 则获取到当前类对象.
            currClassObj[name] = currClassObj[name] || {};
            //新注册类
            if (!currClassObj[name].name || !currClassObj[name]._registed) {
                classObj._registed = true;
                currClassObj[name] = classObj;
            } else if (currClassObj[name]._registed) {
                isRegisted = true;
                for (var key in classObj) {
                    if (key && classObj.hasOwnProperty(key) && typeof currClassObj[name][key] === "undefined") {
                        isPartClass = true;
                        currClassObj[name][key] = classObj[key];
                    }
                }
            }
            //此时通过 currClassObj[name] 获取到的是类的完整定义, classObj只包括类的部分定义.
            //所以修改 classObj 的引用, 让其指向 currClassObj[name]
            classObj = currClassObj[name];
            //如果是第一次注册类或者是分部类, 则需要加载依赖项
            if (!isRegisted || isPartClass) {
                //加载依赖
                var unloadClassArray = this.loadDeps(classObj);
                //发现未加载的依赖类
                if (unloadClassArray.length > 0) {
                    this.loader = this.loader || this.using("oojs.loader");
                    if (this.runtime === "browser" && this.loader) {
                        //浏览器模式下, 如果发现存在未加载的依赖项, 并且安装了 oojs.loader, 则不立刻调用静态函数, 需要先加载依赖类.
                        this.loader.loadDepsBrowser(classObj);
                    } else {
                        //发现未加载的依赖类, 抛出异常
                        throw new Error('class "' + classObj.name + '"' + " loadDeps error:" + unloadClassArray.join(","));
                    }
                } else {
                    //依赖类全部加载完毕, 运行静态构造函数
                    classObj[staticConstructorName] && classObj[staticConstructorName]();
                }
            }
            //兼容node的require命令, 因为闭包问题导致oojs.define中的module始终指向oojs.js文件的module.使用eval和Function无法解决.
            //故通过callee.caller先上寻找oojs.define的调用者, 从调用者环境中获取module.
            if (this.runtime === "node" && arguments.callee.caller.arguments[2]) {
                arguments.callee.caller.arguments[2].exports = classObj;
            }
            return this;
        },
        /**
         * 从全局对象上, 根据命名空间查找类对象
         * @public
         * @param {string} name 类的全限定性名(命名空间+类名, 比如 a.b.c)
         * @return {Object} 类引用
         */
        find: function(name) {
            var result;
            var nameArray = name.split(".");
            result = this.classes[nameArray[0]];
            for (var i = 1, count = nameArray.length; i < count; i++) {
                if (result && result[nameArray[i]]) {
                    result = result[nameArray[i]];
                } else {
                    result = null;
                    break;
                }
            }
            return result;
        },
        /**
         * 获取类引用. 在node模式下会加载类. 在browser模式下只是执行find查找.
         * @public
         * @param {string} name 类的全限定性名(命名空间+类名, 比如 a.b.c)
         * @return {Object} 类引用
         */
        using: function(name) {
            var result = this.find(name);
            if (!result) {
                //加载模块文件, 仅限node模式. node模式属于本地存储, 相当于所有文件已经加载完毕.
                //在browser模式下, 应该在入口对象的deps中指定main函数需要的依赖模块.
                if (this.runtime === "node") {
                    require(this.getClassPath(name));
                    result = this.find(name);
                }
            }
            return result;
        },
        /**
         * 重新加载类. 当一个类发生变化的时候, 可以调用此函数强制更新node和oojs框架缓存的类定义.
         * @public
         * @param {string} name 类的全限定性名(命名空间+类名, 比如 a.b.c)
         * @return {Object} 类引用
         */
        reload: function(name) {
            var result = this.find(name);
            if (result) {
                result._registed = false;
                if (this.runtime === "node") {
                    var classPath = this.getClassPath(name);
                    delete require.cache[require.resolve(classPath)];
                    result = require(classPath);
                }
            } else {
                result = this.using(name);
            }
            return result;
        }
    };
    //自解析
    oojs.define(oojs);
})();