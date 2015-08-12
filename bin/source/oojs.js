/**
 * @file oojs核心, 提供面向对象编程方式.
 * @author zhangziqiu@qq.com
 */
(function() {
    // 类定义
    var oojs = {
        // 类名
        name: "oojs",
        // 命名空间
        namespace: "",
        // 类对象都注册到oojs.classes属性上
        classes: {},
        /**
         * 静态构造函数
         */
        $oojs: function() {
            // 根据不同的运行环境, 设置默认值
            var config = {};
            // 判断是window还是node环境
            // 设置全局作用域, 默认浏览器模式为window, node模式为系统global变量. 会在全局作用域中添加oojs变量.
            if (typeof window !== "undefined" && typeof document !== "undefined") {
                this.runtime = "browser";
                config.global = window;
            } else {
                this.runtime = "node";
                config.global = global;
            }
            // 为Function原型添加的proxy函数的函数名. false表示不添加. 默认为'proxy'. 可以使用oojs.proxy替代
            config.proxyName = "proxy";
            // 设置代码库根目录. node模式使用文件路径(可以是相对路径), 浏览器模式下需要提供完整的url地址.
            config.path = this.runtime === "node" ? process.cwd() + "/src/" : "/src/";
            // 从可访问的 $oojs_config 变量中获取用户定义的配置项
            if (typeof $oojs_config !== "undefined") {
                for (var key in $oojs_config) {
                    if (key && $oojs_config.hasOwnProperty(key)) {
                        config[key] = $oojs_config[key];
                    }
                }
            }
            // 根据config配置项进行初始化
            this.global = config.global || {};
            if (config.proxyName) {
                Function.prototype[config.proxyName] = this.proxy;
            }
            this.setPath(config.path);
            this.global.oojs = this.global.oojs || this;
        },
        // 存储命名空间的目录树
        path: {},
        // 缓存命名空间的路径
        pathCache: {},
        /**
         * 从目录树中, 返回指定命名空间的目录
         * @public
         * @param {string} namespace 命名空间, 比如"A.B.C"
         * @return {string} 路径, 比如 'http://www.123.com/a/b' 或 '/home/user/a/b'
         */
        getPath: function(namespace) {
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
                // 多个命名空间设置路径: oojs.setPath({'a':'/root/projectA', 'b':'/root/projectB'});
                for (var key in namespace) {
                    if (key && namespace.hasOwnProperty(key)) {
                        this.setPath(key, namespace[key]);
                    }
                }
                return;
            }
            if (!path) {
                // 只设置一个根路径: oojs.setPath('/root/');
                path = namespace;
            } else {
                // 为特定命名空间设置路径: oojs.setPath('a.b.c','/root/myproject/');
                var namespaceArray = namespace.split(".");
                for (var i = 0, count = namespaceArray.length; i < count; i++) {
                    var currentName = namespaceArray[i].toLowerCase();
                    node[currentName] = node[currentName] || {
                        _path: node._path
                    };
                    node = node[currentName];
                }
            }
            // 为路径添加末尾的斜杠
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
         * @param {Object} recording 递归加载时, 用于记录一个类的加载状态
         * @return {Object} 递归调用时, 用作recording参数的对象
         */
        loadDeps: function(classObj, recording) {
            recording = recording || {};
            var deps = classObj.deps;
            var unloadClassArray = [];
            for (var key in deps) {
                if (key && deps.hasOwnProperty(key) && deps[key]) {
                    var classFullName;
                    // 如果key对应的是一个非string, 比如一个object, 则表示已经加载完依赖
                    if (typeof deps[key] !== "string") {
                        classObj[key] = deps[key];
                        if (classObj[key] && classObj[key].name) {
                            classObj[key].namespace = classObj[key].namespace || "";
                            classFullName = classObj[key].namespace + classObj[key].name;
                        }
                    } else {
                        // 如果key是string, 表示传递的是oojs的命名空间
                        classFullName = deps[key];
                        classObj[key] = this.find(classFullName);
                    }
                    // 两种情况下跳过依赖加载.
                    // 1.已经被加载过, 即已经在recording中存在
                    // 2.没有找到classFullName. 即模块是node模块而非oojs模块
                    if (!classFullName || recording[classFullName]) {
                        continue;
                    }
                    recording[classFullName] = true;
                    if (!classObj[key]) {
                        // node模式下, 发现未加载的依赖类, 尝试使用require加载
                        if (this.runtime === "node") {
                            classObj[key] = require(this.getClassPath(classFullName));
                            if (!classObj[key]) {
                                // node模式下, 如果依赖类无法加载则报错
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
                } else {
                    this.define(result);
                }
            } else {
                result = this.using(name);
            }
            return result;
        },
        /**
         * 创建一个类实例.  var a = oojs.create(classA, 'a');
         * @public
         * @param {Object|string} classObj 类对象或者类的全限定性名, 比如'a.b.c'
         * @param {...*} params 动态构造函数的参数.
         * @return {Object} 类实例
         */
        create: function(classObj, params) {
            var args = Array.prototype.slice.call(arguments, 0);
            args.shift();
            // classObj如果是字符串, 则尝试使用using加载类.
            if (typeof classObj === "string") {
                classObj = this.using(classObj);
            }
            if (!classObj || !classObj.name) {
                throw new Error("oojs.create need a class object with a name property");
            }
            // 构造函数名
            var constructerName = "__" + classObj.name || "init";
            // function也是引用类型, 所以这里必须使用新创建的空函数.
            var classFunction = function() {};
            classFunction.prototype = classObj;
            var result = new classFunction();
            // 如果类的某一个属性是对象,则需要克隆
            for (var key in classObj) {
                if (key && classObj.hasOwnProperty(key)) {
                    var item = classObj[key];
                    if (typeof item === "object") {
                        // 经测试, fastClone方法对于Array类型也适用
                        result[key] = this.fastClone(item);
                    }
                }
            }
            // 复制完属性后, 再执行构造函数. 防止构造函数中修改原型类.
            if (result[constructerName]) {
                result[constructerName].apply(result, args);
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
                // 加载模块文件, 仅限node模式. node模式属于本地存储, 相当于所有文件已经加载完毕.
                // 在browser模式下, 应该在入口对象的deps中指定main函数需要的依赖模块.
                if (this.runtime === "node") {
                    require(this.getClassPath(name));
                    result = this.find(name);
                }
            }
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
            // 将动态构造函数改名为"__类名"的形式, 防止程序编程时导致的变量名冲突
            classObj["__" + name] = classObj[name] || function() {};
            // 将静态构造函数同样可以通过"__static_constructor"函数调用
            classObj.__static_constructor = classObj[staticConstructorName] || function() {};
            var isRegisted = false;
            // 是否已经被注册过
            var isPartClass = false;
            // 是否是分部类, 默认不是分部类
            // 初始化前置命名空间
            var preNamespaces = classObj.namespace.split(".");
            var count = preNamespaces.length;
            var currClassObj = this.classes;
            var tempName;
            for (var i = 0; i < count; i++) {
                tempName = preNamespaces[i];
                if (tempName) {
                    currClassObj[tempName] = currClassObj[tempName] || {};
                    currClassObj = currClassObj[tempName];
                }
            }
            // 此时 currClassObj 是当前待注册类所属的命名空间对象. 通过 currClassObj[name] 则获取到当前类对象.
            currClassObj[name] = currClassObj[name] || {};
            // 新注册类
            if (!currClassObj[name].name || !currClassObj[name]._registed) {
                classObj._registed = true;
                currClassObj[name] = classObj;
            } else {
                if (currClassObj[name]._registed) {
                    isRegisted = true;
                    for (var key in classObj) {
                        if (key && classObj.hasOwnProperty(key) && typeof currClassObj[name][key] === "undefined") {
                            isPartClass = true;
                            currClassObj[name][key] = classObj[key];
                        }
                    }
                }
            }
            // 此时通过 currClassObj[name] 获取到的是类的完整定义, classObj只包括类的部分定义.
            // 所以修改 classObj 的引用, 让其指向 currClassObj[name]
            classObj = currClassObj[name];
            // 如果是第一次注册类或者是分部类, 则需要加载依赖项
            if (!isRegisted || isPartClass) {
                // 加载依赖
                var unloadClassArray = this.loadDeps(classObj);
                // 发现未加载的依赖类
                if (unloadClassArray.length > 0) {
                    this.loader = this.loader || this.using("oojs.loader");
                    if (this.runtime === "browser" && this.loader) {
                        // 浏览器模式下, 如果发现存在未加载的依赖项, 并且安装了 oojs.loader, 则不立刻调用静态函数, 需要先加载依赖类.
                        this.loader.loadDepsBrowser(classObj, unloadClassArray);
                    } else {
                        // 发现未加载的依赖类, 抛出异常
                        throw new Error('class "' + classObj.name + '"' + " loadDeps error:" + unloadClassArray.join(","));
                    }
                } else {
                    // 依赖类全部加载完毕, 运行静态构造函数
                    classObj[staticConstructorName] && classObj[staticConstructorName]();
                }
            }
            // 兼容node的require命令, 因为闭包问题导致oojs.define中的module始终指向oojs.js文件的module.使用eval和Function无法解决.
            // 故通过callee.caller先上寻找oojs.define的调用者, 从调用者环境中获取module.
            if (this.runtime === "node" && arguments.callee.caller.arguments[2]) {
                arguments.callee.caller.arguments[2].exports = classObj;
            }
            return this;
        }
    };
    // 自解析
    oojs.define(oojs);
})();

oojs.define({
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
     event集合. 记录所有绑定的事件.
     格式为:
     {
         eventName:{
             name: eventName,	//event名
             callbacks: [{
                     callback:function(){},	//回调函数
                     data:null,  	        //回调函数返回的数据
                     needTimes:1,			//希望执行的次数, 默认为 1
                     emitTimes:0				//已经执行了的次数, 默认为 0
                 }],
             emitData:[],		//执行emit时传递的数据
             status:false,		//true表示已经触发过 emit
             groups:{}			//所属groupName索引
         }
     }
     */
    eventList: null,
    /**
     group集合.
     格式为:
     {
        groupName:{
             name: groupName,	//group名
             callbacks: [{
                     callback:function(){},	//回调函数
                     data:null,  	        //回调函数返回的数据
                     needTimes:1,			//希望执行的次数, 默认为 1
                     emitTimes:0				//已经执行了的次数, 默认为 0
                 }],
             emitData:[],		//执行emit时传递的数据
             status:false,		//true表示已经触发过 emit
             events:{},			//group内的eventName数组索引
             previousGroups:{},	//group前节点groupName数组索引
             afterGroups:{}		//group后节点groupName数组索引
         }
     }
     */
    groupList: null,
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
     * 创建一个 Callback
     * {
            callback:function(){},	//回调函数
            data:null,  	        //回调函数返回的数据
            needTimes:1,			//希望执行的次数, 默认为 1
            emitTimes:0				//已经执行了的次数, 默认为 0
        }
     */
    createCallback: function(callback, needTimes, emitTimes) {
        callback = typeof callback !== "undefined" ? callback : function() {};
        needTimes = typeof needTimes !== "undefined" ? needTimes : 1;
        emitTimes = typeof emitTimes !== "undefined" ? emitTimes : 0;
        return {
            callback: callback,
            data: null,
            needTimes: needTimes,
            emitTimes: emitTimes
        };
    },
    /**
     * 创建一个event对象.
     */
    createEvent: function(eventName) {
        var result = {
            name: eventName,
            callbacks: [],
            callbackData: [],
            emitData: [],
            status: false,
            groups: {}
        };
        return result;
    },
    /**
     * 创建一个group对象.
     */
    createGroup: function(groupName) {
        var result = {
            name: groupName,
            callbacks: [],
            callbackData: [],
            emitData: [],
            status: false,
            events: {},
            previousGroups: {},
            afterGroups: {}
        };
        return result;
    },
    /**
     * 为事件添加事件处理函数
     * @param {string} eventName 事件名
     * @param {number} times 可以不传递, 事件处理函数执行几次, 默认为1次, 循环执行传递-1
     * @param {Function} callback 事件处理函数, 可传递数组
     */
    bind: function(eventName, times, callback) {
        // 函数重载处理. 如果传递2个参数, 表示 times=1
        if (arguments.length === 2) {
            callback = times;
            times = 1;
        }
        // 设置times默认值. 如果传递的times不正确, 则设置为默认值1
        times = typeof times !== "number" ? 1 : times;
        // 如果event对象不存在,则创建新的event对象
        var ev = this.eventList[eventName] = this.eventList[eventName] || this.createEvent(eventName);
        callback = callback instanceof Array ? callback : [ callback ];
        for (var i = 0, count = callback.length; i < count; i++) {
            ev.callbacks.push(this.createCallback(callback[i], times));
        }
        // 如果事件已经触发过, 则立刻执行
        if (ev.status && ev.emitData.length) {
            for (var i = 0, count = ev.emitData.length; i < count; i++) {
                this.emit(ev.name, ev.emitData[i]);
            }
            // 执行完毕后清空eventData, 避免重复调用.
            ev.emitData = [];
        }
        return this;
    },
    /**
     * 为事件取消绑定事件处理函数
     * @param {string} eventName 事件名. 如果只传递事件名则表示删除此事件的所有callback
     * @param {Function} callback 事件处理函数. 可以不传递.
     */
    removeListener: function(eventName, callback) {
        if (this.eventList[eventName]) {
            var ev = this.eventList[eventName];
            if (ev.callbacks && ev.callbacks.length) {
                for (var i = 0, count = ev.callbacks.length; i < count; i++) {
                    if (callback) {
                        if (callback === ev.callbacks[i].callback) {
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
     * 为事件取消绑定事件处理函数.
     * 一个参数: 只传递一个参数 eventName 则删除此eventName的所有callback
     * 两个参数: 同时传递eventName和callback 则删除此eventName的指定callback
     * 无参数:   表示移除所有事件的所有callback
     * @param {string} eventName 事件名
     * @param {Function} callback 事件处理函数
     */
    unbind: function(eventName, callback) {
        if (!eventName && !callback) {
            // 移除所有的事件处理函数
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
        var ev = this.eventList[eventName] = this.eventList[eventName] || this.createEvent(eventName);
        ev.status = true;
        if (!ev.callbacks || !ev.callbacks.length) {
            // 只有一种情况需要缓存emitData: event未绑定任何事件处理函数
            ev.emitData.push(data);
        } else {
            // 执行event的所有callback
            if (ev.callbacks && ev.callbacks.length) {
                for (var i = 0, count = ev.callbacks.length; i < count; i++) {
                    var callbackItem = ev.callbacks[i];
                    var callbackFunction = callbackItem.callback;
                    var needRun = false;
                    if (callbackItem.needTimes === -1) {
                        // 设置-1表示循环执行
                        needRun = true;
                    } else {
                        if (callbackItem.needTimes > 0 && callbackItem.emitTimes < callbackItem.needTimes) {
                            // 未达到设置的最大执行次数
                            needRun = true;
                        }
                    }
                    callbackItem.emitTimes++;
                    if (needRun && callbackFunction) {
                        callbackItem.data = callbackFunction(data);
                    }
                }
            }
        }
        // 处理group
        for (var groupName in ev.groups) {
            if (groupName && ev.groups.hasOwnProperty(groupName) && ev.groups[groupName]) {
                this.groupEmit(groupName);
            }
        }
        return this;
    },
    /**
     * 创建事件组
     * @param {string} groupName 事件组名,需要在当前event对象中唯一
     * @param {string|Array} eventNames 需要绑定的事件名或事件名集合
     * @param {Function} callback 事件组中的事件全部完成时, 执行的事件处理函数
     */
    group: function(groupName, eventNames, callback) {
        var group = this.groupList[groupName] = this.groupList[groupName] || this.createGroup(groupName);
        // 添加group的callback
        if (callback) {
            callback = callback instanceof Array ? callback : [ callback ];
            for (var i = 0, count = callback.length; i < count; i++) {
                group.callbacks.push(this.createCallback(callback[i], 1));
            }
        }
        // eventNames可以是string或Array
        var eventName;
        eventNames = typeof eventNames === "string" ? [ eventNames ] : eventNames;
        for (var i = 0, count = eventNames.length; i < count; i++) {
            eventName = eventNames[i];
            // 如果event不在此分组中, 则添加到分组
            if (!group.events[eventName]) {
                group.status = false;
                // 新添加了事件, 设置group的状态为false
                // 如果事件不存在则创建
                var ev = this.eventList[eventName] = this.eventList[eventName] || this.createEvent(eventName);
                ev.groups[groupName] = 1;
                group.events[eventName] = 1;
            }
        }
        // 触发一次 groupEmit, 如果新绑定的event已经是执行完毕的, 则group会立刻触发
        if (eventNames.length > 0) {
            this.groupEmit(groupName);
        }
        return this;
    },
    /**
     * 事件组触发函数
     * @param {string} groupName 事件组名
     */
    groupEmit: function(groupName) {
        var group = this.groupList[groupName] = this.groupList[groupName] || this.createGroup(groupName);
        // 首先检查 afterGroups, 如果afterGroups没有准备完毕, 则立刻停止emit
        var afterGroups = group.afterGroups;
        var afterGroupFinished = true;
        for (var afterGroupName in afterGroups) {
            if (afterGroupName && afterGroups.hasOwnProperty(afterGroupName)) {
                if (this.groupList[afterGroupName]) {
                    // 存在group, 检查group是否已完成
                    if (!this.groupList[afterGroupName].status) {
                        afterGroupFinished = false;
                    }
                } else {
                    // group未创建
                    this.groupList[afterGroupName] = this.createGroup(afterGroupName);
                    afterGroupFinished = false;
                }
            }
        }
        // 如果 afterGroups 存在未完成的group, 则立刻停止运行.
        if (!afterGroupFinished) {
            return this;
        }
        // 检索group中的所有event是否执行完毕
        var events = group.events;
        var eventFinished = true;
        var ev;
        for (var eventName in events) {
            if (eventName && events.hasOwnProperty(eventName) && events[eventName]) {
                ev = this.eventList[eventName] = this.eventList[eventName] || this.createEvent(eventName);
                if (!ev.status) {
                    // 事件未完成
                    eventFinished = false;
                    break;
                }
            }
        }
        // 所有的event已经完成
        if (eventFinished) {
            // 设置group已完成
            group.status = true;
            // 获取event callback的返回数据
            var eventCallbackData = {};
            for (var eventName in events) {
                if (eventName && events.hasOwnProperty(eventName) && events[eventName]) {
                    var callbacks = this.eventList[eventName].callbacks;
                    eventCallbackData[eventName] = [];
                    for (var i = 0, count = callbacks.length; i < count; i++) {
                        eventCallbackData[eventName].push(callbacks[i].data);
                    }
                    // 如果数组中只有一个元素, 则不传递数组直接传递元素.
                    if (eventCallbackData[eventName].length === 1) {
                        eventCallbackData[eventName] = eventCallbackData[eventName][0];
                    }
                }
            }
            // 执行group的回调函数
            if (group.callbacks && group.callbacks.length) {
                for (var i = 0, count = group.callbacks.length; i < count; i++) {
                    var callbackItem = group.callbacks[i];
                    var callbackFunction = callbackItem.callback;
                    var needRun = false;
                    if (callbackItem.needTimes === -1) {
                        // 设置-1表示循环执行
                        needRun = true;
                    } else {
                        if (callbackItem.needTimes > 0 && callbackItem.emitTimes < callbackItem.needTimes) {
                            // 未达到设置的最大执行次数
                            needRun = true;
                        }
                    }
                    callbackItem.emitTimes++;
                    if (needRun && callbackFunction) {
                        callbackItem.data = callbackFunction(eventCallbackData);
                    }
                }
            }
            // 执行previousGroups的emit
            var previousGroups = group.previousGroups;
            for (var previousGroupName in previousGroups) {
                if (previousGroupName && previousGroups.hasOwnProperty(previousGroupName)) {
                    this.groupEmit(previousGroupName);
                }
            }
        }
        return this;
    },
    /**
     * 构造事件组队列.     *
     * ev.queue(['groupA, groupB'], ['groupC'], ['groupD', 'groupE']);
     *ev.queue('groupA', ['groupB','groupC'], 'groupD');
     */
    queue: function(previousGroupName, nextGroupName) {
        var args = Array.prototype.slice.apply(arguments);
        var previousGroups;
        var nextGroups;
        for (var i = 1, count = args.length; i < count; i++) {
            previousGroups = args[i - 1];
            nextGroups = args[i];
            // 都处理成数组统一处理
            previousGroups = previousGroups instanceof Array ? previousGroups : [ previousGroups ];
            nextGroups = nextGroups instanceof Array ? nextGroups : [ nextGroups ];
            // 添加关联关系
            for (var j = 0, jcount = previousGroups.length; j < jcount; j++) {
                var previousGroupName = previousGroups[j];
                this.groupList[previousGroupName] = this.groupList[previousGroupName] || this.createGroup(previousGroupName);
                var previousGroup = this.groupList[previousGroupName];
                for (var k = 0, kcount = nextGroups.length; k < kcount; k++) {
                    var nextGroupName = nextGroups[k];
                    this.groupList[nextGroupName] = this.groupList[nextGroupName] || this.createGroup(nextGroupName);
                    var nextGroup = this.groupList[nextGroupName];
                    // 添加关联
                    previousGroup.afterGroups[nextGroupName] = 1;
                    nextGroup.previousGroups[previousGroupName] = 1;
                }
            }
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

oojs.define({
    /**
     * 类加载器. 使用oojs.event实现. 
     * 当类A以类B, 类B依赖类C时, 会递归加载所有的依赖类, 当所有的依赖类都加载完毕后, 执行类A的静态构造函数.
     */
    name: "loader",
    namespace: "oojs",
    deps: {
        event: "oojs.event"
    },
    $loader: function() {
        this.ev = oojs.create(this.event);
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
        if (version) {
            url += "?v=" + version;
        }
        callback = callback || function() {};
        // loading对象记录已经加载过的日志, 保证一个地址不会被加载多次
        this.loading = this.loading || {};
        if (this.loading[url]) {
            return;
        }
        this.loading[url] = 1;
        // 加载脚本
        var loader = document.createElement("script");
        loader.type = "text/javascript";
        loader.async = true;
        loader.src = url;
        loader.onload = loader.onerror = loader.onreadystatechange = function(e) {
            if (/loaded|complete|undefined/.test(loader.readyState)) {
                loader.onload = loader.onerror = loader.onreadystatechange = null;
                loader = undefined;
                callback();
            }
        };
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
    loadDepsBrowser: function(classObj, unloadClassArray) {
        // 创建入口类事件组
        var parentFullClassName = classObj.namespace ? classObj.namespace + "." + classObj.name : classObj.name;
        if (!this.ev.groupList[parentFullClassName]) {
            this.ev.group(parentFullClassName, [], function() {
                oojs.reload(parentFullClassName);
            });
        }
        // 处理依赖
        for (var i = 0, count = unloadClassArray.length; i < count; i++) {
            var classFullName = unloadClassArray[i];
            // 绑定事件
            if (!this.ev.eventList[classFullName]) {
                this.ev.bind(classFullName, function() {
                    return true;
                });
            }
            // 添加到父类分组中
            this.ev.group(parentFullClassName, classFullName);
            // 为每一个依赖类创建一个group
            if (!this.ev.groupList[classFullName]) {
                this.ev.group(classFullName, [], function(data, className) {
                    oojs.reload(className);
                }.proxy(this, classFullName));
                this.ev.groupList[classFullName].status = true;
            }
            // 创建队列
            this.ev.queue(parentFullClassName, classFullName);
            // 加载脚本
            var url = oojs.getClassPath(classFullName);
            var jsCallBack = oojs.proxy(this, function(classFullName) {
                console.log("event:" + classFullName);
                this.ev.emit(classFullName, classFullName);
            }, classFullName);
            this.loadScript(url, jsCallBack);
        }
        return this;
    }
});