(function() {
    var oojs = {
        name: "oojs",
        namespace: "",
        basePath: "./",
        //静态构造函数
        $oojs: function() {
            //为Function对象添加proxy函数
            Function.prototype.proxy = function(context) {
                var method = this;
                var args = Array.prototype.slice.apply(arguments);
                var obj = args.shift();
                return function() {
                    var tempArgs = Array.prototype.slice.apply(arguments);
                    return method.apply(obj, tempArgs.concat(args));
                };
            };
            if (typeof define !== "undefined" && define instanceof Array) {
                var defineArray = define;
            }
            if (typeof window !== "undefined") {
                this.global = window;
                this.runtime = "browser";
                this.basePath = "http://cpro.baidustatic.cn/js/";
                this.version = "1.0.0";
                this.global.oojs = oojs;
                this.global.define = this.define.proxy(this);
            } else if (global) {
                this.basePath = __dirname + "\\";
                this.global = global;
                this.runtime = "nodejs";
                global.oojs = oojs;
                global.define = this.define.proxy(this);
                //hack nodejs
                var Module = module.constructor;
                var nativeWrap = Module.wrap;
                Module.wrap = function(script) {
                    script = script.replace(/define\s*&&\s*define\s*\(/gi, "define(module,");
                    return nativeWrap(script);
                };
                module.exports = this;
            }
            if (defineArray && defineArray.length) {
                var classObj;
                for (var i = 0, count = defineArray.length; i < count; i++) {
                    classObj = defineArray[i];
                    define(typeof module !== "undefined" ? module : classObj);
                }
            }
        },
        //用于处理无法遍历Date等对象的问题
        buildInObject: {
            "[object Function]": 1,
            "[object RegExp]": 1,
            "[object Date]": 1,
            "[object Error]": 1,
            "[object Window]": 1
        },
        /**
        快速克隆方法
        @public
        @method fastClone
        @param {Object} source 带克隆的对象. 使用此方法克隆出来的对象, 如果source对象被修改, 则所有克隆对象也会被修改
        @return {Object} 克隆出来的对象.
        **/
        clone: function(source, depth) {
            var result = source, i, len;
            depth = typeof depth === "undefined" ? 0 : depth--;
            if (!source || source instanceof Number || source instanceof String || source instanceof Boolean || depth === 0) {
                return result;
            } else if (source instanceof Array) {
                result = [];
                var resultLen = 0;
                for (i = 0, len = source.length; i < len; i++) {
                    result[resultLen++] = this.clone(source[i]);
                }
            } else if ("object" === typeof source) {
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
        create: function(classObj, params) {
            var args = Array.prototype.slice.call(arguments, 0);
            args.shift();
            //构造函数
            var constructerName = classObj.name || "init";
            var tempClassObj = function(args) {
                this[constructerName] = this[constructerName] || function() {};
                this[constructerName].apply(this, args);
                //web页面在unload时触发析构函数
                if (this.runtime === "browser") {
                    // 事件监听器挂载
                    if (window.addEventListener) {
                        window.addEventListener("unload", this.dispose, false);
                    } else if (window.attachEvent) {
                        window.attachEvent("onunload", this.dispose);
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
        define: function(module, classObj) {
            if (!classObj) {
                classObj = module;
            }
            var name = classObj.name;
            classObj.namespace = classObj.namespace || "";
            classObj.dispose = classObj.dispose || function() {};
            var preNamespaces = classObj.namespace.split(".");
            var runtime = "nodejs";
            if (typeof window !== "undefined") {
                global = window;
                runtime = "browser";
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
            } else if (currClassObj[name].___registered && classObj.classType && classObj.classType === "extend") {
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
            } else {
                //执行静态构造函数
                var staticConstructorName = "$" + name;
                classObj[staticConstructorName] && classObj[staticConstructorName]();
            }
            if (module) {
                module.exports = classObj;
            }
        },
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
        using: function(name) {
            var result = this.find(name);
            if (!result) {
                //加载模块文件, 仅限node模式. node模式属于本地存储, 相当于所有文件已经加载完毕.
                //在browser模式下, 应该在入口对象的deps中指定main函数需要的依赖模块.
                if (this.runtime === "nodejs") {
                    require(this.getClassPath(name));
                    result = this.find(name);
                }
            }
            return result;
        },
        getClassPath: function(fullName) {
            return this.basePath + fullName.replace(/\./gi, "/") + ".js";
        },
        config: function(option) {
            this.basePath = option.basePath || this.basePath;
        }
    };
    //自解析
    oojs.define(typeof module !== "undefined" ? module : null, oojs);
})();

define && define({
    /**
    event类用于处理事件. 自身使用oojs框架实现. 内部实现全部oo化.
    var ev = oojs.create('oojs.event', );
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
    eventList: {},
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
    groupList: {},
    /**
    事件组查询索引器. 
    */
    eventGroupIndexer: {},
    /**
     * 静态构造函数
     */
    $event: function() {},
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
    name: "oojs",
    namespace: "",
    classType: "extend",
    //扩展类
    $oojs: function() {
        this.ev = oojs.using("oojs.event");
    },
    loadScript: function(url, callback) {
        //加载脚本
        var loader = document.createElement("script");
        loader.type = "text/javascript";
        loader.async = true;
        loader.src = url;
        loader.onload = loader.onerror = loader.onreadystatechange = function() {
            if (/loaded|complete|undefined/.test(loader.readyState)) {
                loader.onload = loader.onerror = loader.onreadystatechange = null;
                loader = undefined;
                //脚本加载完毕后, 触发事件
                callback();
            }
        }.proxy(this);
        var s = document.getElementsByTagName("script")[0];
        s.parentNode.insertBefore(loader, s);
    },
    loadDeps: function(classObj) {
        var deps = classObj.deps;
        if (this.runtime === "nodejs") {
            var deps = classObj.deps;
            for (var key in deps) {
                if (key && deps.hasOwnProperty(key)) {
                    classObj[key] = require(this.getClassPath(deps[key]));
                }
            }
            var staticConstructorName = "$" + classObj.name;
            classObj[staticConstructorName] && classObj[staticConstructorName]();
        } else {
            if (deps) {
                for (var key in deps) {
                    if (key && deps.hasOwnProperty(key)) {
                        var classFullName = deps[key];
                        //绑定事件
                        this.ev.bind(classFullName, function(data) {
                            return oojs.using(classFullName);
                        });
                        //创建事件组
                        this.ev.group("loadDeps", [ classFullName ], function(data) {
                            classObj[key] = data[classFullName][0];
                        });
                        //事件组执行完毕后的事件钩子
                        this.ev.afterGroup("loadDeps", function() {
                            //运行静态构造函数
                            var staticConstructorName = "$" + classObj.name;
                            classObj[staticConstructorName] && classObj[staticConstructorName]();
                        });
                        //加载脚本
                        var url = this.basePath + classFullName.replace(/\./gi, "/") + ".js";
                        var jsCallBack = function() {
                            this.ev.emit(classFullName);
                        }.proxy(this);
                        this.loadScript(url, jsCallBack);
                    }
                }
            } else {
                //运行静态构造函数
                classObj[staticConstructorName] && classObj[staticConstructorName]();
            }
        }
    }
});