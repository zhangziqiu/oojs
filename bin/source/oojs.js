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
					needTimes:1,			//希望执行的次数, 默认为 1
					emitTimes:0				//已经执行了的次数, 默认为 0
				}], 
            callbackData:[],	//回调函数返回的数据
			emitData:{},		//执行emit时传递的数据
            status:false,		//true表示已经触发过 emit
			groups:{}			//event所属group
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
					needTimes:1,			//希望执行的次数, 默认为 1
					emitTimes:0				//已经执行了的次数, 默认为 0
				}], 
            callbackData:[],	//回调函数返回的数据
			emitData:{},		//执行emit时传递的数据
            status:false,		//true表示已经触发过 emit
			event:{},			//保存group内的event对象指针
			previousGroup:{},	//group前节点指针. 可能有多个.
			afterGroup:{}		//group后节点指针. 可能有多个.
        }
    }
    */
    groupList: null,
    eventGroupIndexer: null,
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
     * 为事件添加事件处理函数
     * @param {string} eventName 事件名  
	 * @param {number} times 可以不传递, 事件处理函数执行几次, 默认为1次, 循环执行传递-1		 
     * @param {Function} callback 事件处理函数
     */
    bind: function(eventName, times, callback) {
        if (arguments.length === 2) {
            //可以不传递 times
            callback = times;
            times = 1;
        }
        times = typeof times === "undefined" ? 1 : times;
        var ev = this.eventList[eventName] = this.eventList[eventName] || this.createEvent(eventName);
        if (ev.status) {
            //事件已经触发, 则直接调用
            callback(ev.emitData);
        } else {
            //事件未触发, 添加到事件回调函数数组
            (ev.callbacks = ev.callbacks || []).push({
                callback: callback,
                needTimes: times,
                emitTimes: 0
            });
            ev.status = false;
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
        //获取event, 如果没有没有找到则创建一个默认的event
        var ev = this.eventList[eventName] = this.eventList[eventName] || this.createEvent(eventName);
        //绑定了callback
        if (ev.callbacks && ev.callbacks.length) {
            var callbackCount = ev.callbacks.length;
            ev.callbackData = [];
            //清空
            for (var i = 0; i < callbackCount; i++) {
                var callbackItem = ev.callbacks[i];
                var callbackFunction = callbackItem.callback;
                var needRun = false;
                if (callbackItem.needTimes === -1) {
                    //设置-1表示循环执行
                    needRun = true;
                } else if (callbackItem.needTimes > 0 && callbackItem.emitTimes < callbackItem.needTimes) {
                    //未达到设置的最大执行次数		
                    needRun = true;
                }
                callbackItem.emitTimes++;
                if (needRun && callbackFunction) {
                    callbackItem.data = callbackFunction(data);
                }
            }
        }
        //保存event事件的数据
        ev.status = true;
        ev.emitData = data || {};
        //处理group
        var groups = ev.groups || [];
        for (var i = 0, count = groups.length; i < count; i++) {
            var groupName = groups[i];
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
            //获取event, 如果没有则创建默认的event对象
            var ev = this.eventList[eventName] = this.eventList[eventName] || this.createEvent(eventName);
            //设置event对象的group指针
            ev.groups[groupName] = group;
            //group对象只需要记录eventName即可, 可以用eventName直接从eventList中获取event对象
            group.events[eventName] = 1;
        }
        //触发一次 groupEmit, 如果新绑定的event已经是执行完毕的, 则group会立刻触发
        this.groupEmit(groupName);
        return this;
    },
    /**
     * 事件组触发函数
     * @param {string} groupName 事件组名
     */
    groupEmit: function(groupName) {
        var group = this.groupList[groupName];
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
                    callbackData[eventName] = ev.callbackData;
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
        if (version) {
            url += "?v=" + version;
        }
        callback = callback || function() {};
        this.ev.bind(url, oojs.proxy(this, function(data, callback) {
            callback && callback();
        }, callback));
        //loading对象记录已经加载过的日志, 保证一个地址不会被加载多次
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
        loader.onload = loader.onerror = loader.onreadystatechange = oojs.proxy(this, function(e, url, loader) {
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
        }, url, loader);
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
                    var loadedClass = oojs.using(classFullName);
                    if (loadedClass) {
                        classObj[key] = loadedClass;
                        continue;
                    }
                    //绑定事件
                    this.ev.bind(classFullName, function(data) {
                        var result = oojs.using(data.classFullName);
                        if (!result) {
                            throw new Error(data.classFullName + " load error in url: " + data.url);
                        }
                        return result;
                    });
                    //创建事件组
                    this.ev.group("loadDeps", [ classFullName ], oojs.proxy(this, function(data, key, classFullName, classObj) {
                        classObj[key] = data[classFullName][0];
                    }, key, classFullName, classObj));
                    //事件组执行完毕后的事件钩子
                    this.ev.afterGroup("loadDeps", oojs.proxy(this, function(data, classObj) {
                        //运行静态构造函数
                        var staticConstructorName = "$" + classObj.name;
                        classObj[staticConstructorName] && classObj[staticConstructorName]();
                    }, classObj));
                    //加载脚本
                    var url = oojs.getClassPath(classFullName);
                    var jsCallBack = oojs.proxy(this, function(classFullName, url) {
                        this.ev.emit(classFullName, {
                            classFullName: classFullName,
                            url: url
                        });
                    }, classFullName, url);
                    this.loadScript(url, jsCallBack);
                }
            }
        } else {
            //运行静态构造函数
            classObj[staticConstructorName] && classObj[staticConstructorName]();
        }
        return oojs;
    }
});