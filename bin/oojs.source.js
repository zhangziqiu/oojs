(function() {
    /**
     *   oojs核心, 提供面向对象编程方式.
     **/
    var oojs = {
        name: "oojs",
        namespace: "",
        config: {
            //设置全局作用域, 默认浏览器模式为window, node模式为系统global变量.
            global: false,
            //为Function原型添加的proxy函数的函数名. false表示不添加. 默认为'proxy'. 可以使用oojs.proxy替代
            proxyName: "proxy",
            //设置代码库根目录. node模式使用文件路径(可以使相对路径), 浏览器模式下需要提供完整的url地址.
            basePath: ""
        },
        /**
         * 静态构造函数
         */
        $oojs: function() {
            //设置可访问的 $oojs_config 变量(比如全局变量), 可以修改oojs的初始化设置. 设置项参见oojs.config属性.
            this.config = typeof $oojs_config !== "undefined" ? $oojs_config : this.config;
            if (typeof window !== "undefined") {
                this.global = this.config.global || window;
                this.runtime = "browser";
                this.basePath = this.config.basePath;
            } else if (global) {
                var path = require("path");
                this.global = this.config.global || global;
                this.runtime = "node";
                //nodejs模式下, 默认为程序根目录的src文件夹
                this.basePath = this.config.basePath ? path.resolve(this.config.basePath) : process.cwd() + "/src/";
                //hack nodejs, 让oojs的类也可以通过node原生的require引用. 
                var Module = module.constructor;
                var nativeWrap = Module.wrap;
                Module.wrap = function(script) {
                    script = script.replace(/define\s*&&\s*define\s*\(/gi, "define(module,");
                    return nativeWrap(script);
                };
                module.exports = this;
            }
            //设置Function的原型proxy函数		
            if (this.config.proxyName) {
                Function.prototype[this.config.proxyName] = this.proxy;
            }
            //设置全局define函数
            this.global.define = this.proxy(this, this.define);
            //设置全局oojs对象
            this.global.oojs = oojs;
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
            //构造函数
            var constructerName = classObj.name || "init";
            var tempClassObj = function(args) {
                this[constructerName] = this[constructerName] || function() {};
                this[constructerName].apply(this, args);
            };
            tempClassObj.prototype = classObj;
            var result = new tempClassObj(args);
            //如果类的某一个属性是对象,则需要克隆
            for (var classPropertyName in classObj) {
                var temp = classObj[classPropertyName];
                if (temp && classObj.hasOwnProperty(classPropertyName) && typeof temp === "object") {
                    result[classPropertyName] = this.fastClone(temp);
                }
            }
            result.instances = null;
            //todo 类上记录所有类实例的引用, 以便进行垃圾回收
            //classObj.instances = classObj.instances || [];
            //classObj.instances.push(result);
            return result;
        },
        /**
         * 设置类的继承关系.  
            oojs.inherit('myNamespace.myClassA', 'myNamespace.myClassB');
            oojs.inherit(objA, objB);  
         * @public
         * @method create
         * @param {Object} classObj 类对象
         * @param {params} 动态构造函数的参数
         * @return {Object} 类实例
         */
        inherit: function(childClass, parentClass) {
            childClass = typeof childClass === "string" ? this.using(childClass) : childClass;
            parentClass = typeof parentClass === "string" ? this.using(parentClass) : parentClass;
            for (var key in parentClass) {
                if (key && parentClass.hasOwnProperty(key) && !childClass.hasOwnProperty(key)) {
                    childClass[key] = parentClass[key];
                }
            }
        },
        loadDeps: function(classObj, recording) {
            recording = recording || {};
            var deps = classObj.deps;
            var depsAllLoaded = true;
            for (var key in deps) {
                if (key && deps.hasOwnProperty(key) && deps[key]) {
                    var classFullName = deps[key];
                    classObj[key] = this.find(classFullName);
                    if (recording && recording[classFullName]) {
                        continue;
                    }
                    recording[classFullName] = true;
                    if (!classObj[key]) {
                        //node模式下, 发现未加载的依赖类, 尝试使用require加载
                        if (this.runtime === "node") {
                            try {
                                classObj[key] = require(this.getClassPath(classFullName));
                            } catch (ex) {}
                        }
                        if (!classObj[key]) {
                            depsAllLoaded = false;
                        }
                    } else {
                        if (classObj[key].deps) {
                            depsAllLoaded = depsAllLoaded && this.loadDeps(classObj[key], recording);
                        }
                    }
                }
            }
            return depsAllLoaded;
        },
        /**
         * 定义一个类. 第一个参数module在node中由系统自动传递. 即开发人员只需要传递一个参数classObj
         * @public
         * @param {Object} module node模式中的module对象
         * @param {Object} classObj 类对象
         * @return {Object} oojs引用
         */
        define: function(module, classObj) {
            if (!classObj) {
                classObj = module;
            }
            var name = classObj.name;
            classObj.namespace = classObj.namespace || "";
            classObj.dispose = classObj.dispose || function() {};
            var preNamespaces = classObj.namespace.split(".");
            //初始化前置命名空间
            var count = preNamespaces.length;
            var currClassObj = this.global;
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
            } else if (currClassObj[name].___registered && classObj.classType && classObj.classType === "extend") {
                for (var key in classObj) {
                    if (key && classObj.hasOwnProperty(key)) {
                        currClassObj[name][key] = classObj[key];
                    }
                }
                classObj = currClassObj[name];
            }
            classObj = currClassObj[name];
            //加载依赖
            var depsAllLoaded = this.loadDeps(classObj);
            //浏览器模式下, 如果发现存在未加载的依赖项, 并且安装了 oojs.loader, 则不立刻调用静态函数, 需要先加载依赖类.
            if (!depsAllLoaded && this.runtime === "browser" && this.loadDepsBrowser) {
                this.loadDepsBrowser(classObj);
            } else {
                //运行静态构造函数
                var staticConstructorName = "$" + name;
                classObj[staticConstructorName] && classObj[staticConstructorName]();
            }
            //兼容node的require命令
            if (module && this.runtime === "node") {
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
        find: function(name) {
            var result;
            var nameArray = name.split(".");
            result = this.global[nameArray[0]];
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
         * 获取类引用. 在node模式下回加载类. 在browser模式下只是执行find查找.
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
         * 获取类的资源文件相对路径
         * @public
         * @param {string} name 类的全限定性名(命名空间+类名, 比如 a.b.c)
         * @return {string} 资源文件的相对路径(比如 /a/b/c.js)
         */
        getClassPath: function(name) {
            return this.basePath + name.replace(/\./gi, "/") + ".js";
        }
    };
    //自解析
    oojs.$oojs();
    oojs.define(typeof module !== "undefined" ? module : null, oojs);
    return oojs;
})();

define && define({
    /**
    event类用于处理事件. 自身使用oojs框架实现. 内部实现全部oo化.
    var ev = oojs.create(oojs.event, );
    单事件绑定:
    ev.bind('eventA', function(data){
        console.log(data);
    });
    ev.emit('eventA', 'I am A'); //output:I am A
    
    事件组绑定:
    ev.bind('eventA', function(data){
        console.log(data);
        return 'Hello ';
    });
    ev.bind('eventB', function(data){
        console.log(data);
        return 'world!';
    });
    //创建事件组, 只有当eventA和eventB都执行完成后, 才会调用事件组的回调函数
    ev.group('MyGroup', ['eventA', 'eventB'], function(data){
        dataA = data['eventA'];
        dataB = data['eventB'];
        console.log(dataA + dataB);
        console.log(dataB);
    });
    ev.emit('eventA', 'I am A'); //output:I am A
    ev.emit('eventB', 'I am B'); //output:I am B
    //output: Hello World!
    
     */
    name: "event",
    namespace: "oojs",
    /** 
    事件集合. 记录所有绑定的事件.
    格式为: 
    {
        eventName:{ 
            callbacks: [], 
            data:[], 
            afters:[], 
            status:false 
        }
    }
    */
    eventList: null,
    /** 
    事件组集合. 记录所有事件组的绑定关系
    格式为: 
        { 
            groupName:{
                events: {'eventName':times}, 
                callbacks: [], 
                afters: []
            } 
        }
    */
    groupList: null,
    /**
    事件组查询索引器. 
    */
    eventGroupIndexer: null,
    /**
     * 静态构造函数
     */
    $event: function() {},
    /**
     * 动态构造函数
     */
    event: function() {
        this.eventList = {};
        this.groupList = {};
        this.eventGroupIndexer = {};
    },
    /**
     * 为事件添加事件处理函数
     * @param {string} eventName 事件名     
     * @param {Function} callback 事件处理函数
     */
    bind: function(eventName, callback) {
        var ev = this.eventList[eventName] = this.eventList[eventName] || {};
        (ev.callbacks = ev.callbacks || []).push(callback);
        ev.status = false;
        return this;
    },
    /**
     * 为事件取消绑定事件处理函数
     * @param {string} eventName 事件名     
     * @param {Function} callback 事件处理函数
     */
    removeListener: function(eventName, callback) {
        if (this.eventList[eventName]) {
            var ev = this.eventList[eventName];
            if (ev.callbacks && ev.callbacks.length) {
                for (var i = 0, count = ev.callbacks.length; i < count; i++) {
                    if (callback) {
                        if (callback === ev.callbacks[i]) {
                            ev.callbacks[i] = null;
                            break;
                        }
                    } else {
                        ev.callbacks[i] = null;
                        continue;
                    }
                }
            }
        }
    },
    /**
     * 为事件取消绑定事件处理函数
     * @param {string} eventName 事件名     
     * @param {Function} callback 事件处理函数
     */
    unbind: function(eventName, callback) {
        if (!eventName && !callback) {
            //移除所有的事件处理函数
            var key;
            for (key in this.eventList) {
                if (key && this.eventList[key] && this.eventList.hasOwnProperty(key)) {
                    this.removeListener(key);
                }
            }
        } else {
            this.removeListener(eventName, callback);
        }
    },
    /**
     * 事件触发.
     * @param {string} eventName 事件名     
     * @param {Object} data 事件数据, 会传递给事件处理函数
     */
    emit: function(eventName, data) {
        //处理event
        var ev = this.eventList[eventName];
        if (ev && ev.callbacks && ev.callbacks.length) {
            var callbackCount = ev.callbacks.length;
            ev.data = [];
            for (var i = 0; i < callbackCount; i++) {
                var callback = ev.callbacks[i];
                if (callback) {
                    ev.data.push(callback(data));
                }
            }
            ev.callbacks = null;
            ev.status = true;
        }
        //处理group, 找到绑定了event的所有group, 并触发groupEmit
        var groups = this.eventGroupIndexer[eventName] || [];
        for (var i = 0, count = groups.length, groupName; i < count; i++) {
            groupName = groups[i];
            if (groupName) {
                this.groupEmit(groupName);
            }
        }
    },
    /**
     * 创建事件组
     * @param {string} groupName 事件组名,需要在当前event对象中唯一
     * @param {Array} eventNames 需要绑定的事件名集合     
     * @param {Function} callback 事件组中的事件全部完成时, 执行的事件处理函数
     */
    group: function(groupName, eventNames, callback) {
        this.groupList[groupName] = this.groupList[groupName] || {};
        var group = this.groupList[groupName];
        var events = group.events = group.events || {};
        //添加group的callback
        if (callback) {
            (group.callbacks = group.callbacks || []).push(callback);
        }
        //记录event与group的关系    
        var eventName, eventNames = eventNames || [];
        for (var i = 0, count = eventNames.length; i < count; i++) {
            eventName = eventNames[i];
            events[eventName] = 1;
            (this.eventGroupIndexer[eventName] = this.eventGroupIndexer[eventName] || []).push(groupName);
        }
    },
    /**
     * 事件组触发函数
     * @param {string} groupName 事件组名
     */
    groupEmit: function(groupName) {
        var group = this.groupList[groupName];
        //安全性监测
        if (!group) return;
        //检索group中的所有event是否执行完毕
        var events = group.events = group.events || {};
        var groupFinished = true;
        var callbackData = {};
        var eventName, ev;
        for (eventName in events) {
            if (eventName && events.hasOwnProperty(eventName)) {
                ev = this.eventList[eventName];
                if (!ev || !ev.status) {
                    //未完成
                    groupFinished = false;
                    callbackData = null;
                    break;
                } else {
                    callbackData[eventName] = ev.data;
                }
            }
        }
        eventName = null;
        //执行group的回调函数
        if (groupFinished) {
            //处理callback回调函数数组
            group.callbacks = group.callbacks || [];
            var callbacks = group.callbacks;
            var count = callbacks.length || 0;
            var callback;
            for (var i = 0; i < count; i++) {
                callback = group.callbacks[i];
                if (callback) {
                    callback(callbackData);
                    group.callbacks[i] = null;
                }
            }
            callback = null;
            group.callbacks = null;
            //处理after回调函数数组
            var afters = group.afters = group.afters || [];
            var count = afters.length || 0;
            var afterCallback;
            for (var i = 0; i < count; i++) {
                afterCallback = afters[i];
                if (afterCallback) {
                    afterCallback(callbackData);
                    afters[i] = null;
                }
            }
            afterCallback = null;
            group.afters = null;
        }
    },
    /**
     * 添加事件组执行完毕后的回调函数. 
     * @param {string} groupName 事件组名
     * @param {Function} callback 回调函数.此回调函数会在事件组绑定的所有事件都执行完毕后执行.
     */
    afterGroup: function(groupName, callback) {
        var group = this.groupList[groupName] = this.groupList[groupName] || {};
        var afters = group.afters = group.afters || [];
        afters.push(callback);
    }
});

define && define({
    /**
     * 类加载器. 使用oojs.event实现. 
     * 当类A以类B, 类B依赖类C时, 会递归加载所有的依赖类, 当所有的依赖类都加载完毕后, 执行类A的静态构造函数.
     */
    name: "oojs",
    namespace: "",
    classType: "extend",
    //扩展类
    $oojs: function() {
        this.ev = oojs.create(oojs.event);
    },
    /**
     * 判断是否空对象
     * @param {object} obj 待验证对象     
     * @param {boolean} 是否为空对象
     */
    isNullObj: function(obj) {
        for (var i in obj) {
            if (obj.hasOwnProperty(i)) {
                return false;
            }
        }
        return true;
    },
    /**
     * 异步加载js文件
     * @public
     * @param {string} url js文件的url路径
     * @param {string} version 文件的版本号.不传递则默认为1.0.0
     * @param {Function} callback js加载完毕后的回调函数
     * @return {object} oojs对象引用
     */
    loadScript: function(url, version, callback) {
        if (typeof version === "function") {
            callback = version;
            version = "1.0.0";
        }
        version = version || "1.0.0";
        if (url.indexOf("http") < 0) {
            url = this.basePath + url.replace(/\./g, "/") + ".js";
        }
        if (version) {
            url += "?v=" + version;
        }
        callback = callback || function() {};
        this.ev.bind(url, function(data, callback) {
            callback && callback();
        }.proxy(this, callback));
        this.loading = this.loading || {};
        if (this.loading[url]) {
            return;
        }
        this.loading[url] = 1;
        //加载脚本
        var loader = document.createElement("script");
        loader.type = "text/javascript";
        loader.async = true;
        loader.src = url;
        loader.onload = loader.onerror = loader.onreadystatechange = function(e, url, loader) {
            if (typeof e === "string") {
                url = e;
                loader = url;
            }
            if (/loaded|complete|undefined/.test(loader.readyState)) {
                loader.onload = loader.onerror = loader.onreadystatechange = null;
                loader = undefined;
                //脚本加载完毕后, 触发事件
                this.ev.emit(url, 1);
            }
        }.proxy(this, url, loader);
        var s = document.getElementsByTagName("script")[0];
        s.parentNode.insertBefore(loader, s);
        return this;
    },
    /**
     * 浏览器加载类依赖
     * @public
     * @param {object} classObj 类对象
     * @return {object} oojs对象引用
     */
    loadDepsBrowser: function(classObj) {
        var deps = classObj.deps;
        var staticConstructorName = "$" + classObj.name;
        if (!this.isNullObj(deps)) {
            for (var key in deps) {
                if (key && deps.hasOwnProperty(key)) {
                    var classFullName = deps[key];
                    //已经加载完毕的模块
                    var loadedClass = this.using(classFullName);
                    if (loadedClass) {
                        classObj[key] = loadedClass;
                        continue;
                    }
                    //绑定事件
                    this.ev.bind(classFullName, function(data, classFullName) {
                        return oojs.using(classFullName);
                    }.proxy(this, classFullName));
                    //创建事件组
                    this.ev.group("loadDeps", [ classFullName ], function(data, key, classFullName, classObj) {
                        classObj[key] = data[classFullName][0];
                    }.proxy(this, key, classFullName, classObj));
                    //事件组执行完毕后的事件钩子
                    this.ev.afterGroup("loadDeps", function(data, lassObj) {
                        //运行静态构造函数
                        var staticConstructorName = "$" + classObj.name;
                        classObj[staticConstructorName] && classObj[staticConstructorName]();
                    }.proxy(this, classObj));
                    //加载脚本
                    var url = this.basePath + classFullName.replace(/\./gi, "/") + ".js";
                    var jsCallBack = function(classFullName) {
                        this.ev.emit(classFullName);
                    }.proxy(this, classFullName);
                    this.loadScript(url, jsCallBack);
                }
            }
        } else {
            //运行静态构造函数
            classObj[staticConstructorName] && classObj[staticConstructorName]();
        }
        return this;
    }
});