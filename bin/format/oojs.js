(function() {
    var oojs = {
        name: "oojs",
        namespace: "",
        classes: {},
        noop: function() {},
        $oojs: function() {
            var config = {};
            if (typeof window !== "undefined" && window && typeof document !== "undefined" && document) {
                this.runtime = "browser";
                config.global = window;
            } else {
                this.runtime = "node";
                config.global = global;
            }
            config.proxyName = "proxy";
            config.path = this.runtime === "node" ? process.cwd() + "/src/" : "/src/";
            if (typeof $oojs_config !== "undefined") {
                for (var key in $oojs_config) {
                    if (key && $oojs_config.hasOwnProperty(key)) {
                        config[key] = $oojs_config[key];
                    }
                }
            }
            this.global = config.global;
            if (config.proxyName) {
                Function.prototype[config.proxyName] = this.proxy;
            }
            this.setPath(config.path);
            this.global.oojs = this.global.oojs || this;
        },
        path: {},
        pathCache: {},
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
            return node.pathValue;
        },
        setPath: function(namespace, path) {
            var node = this.path;
            if (typeof namespace === "object") {
                for (var key in namespace) {
                    if (key && namespace.hasOwnProperty(key)) {
                        this.setPath(key, namespace[key]);
                    }
                }
                return;
            }
            if (!path) {
                path = namespace;
            } else {
                var namespaceArray = namespace.split(".");
                for (var i = 0, count = namespaceArray.length; i < count; i++) {
                    var currentName = namespaceArray[i].toLowerCase();
                    node[currentName] = node[currentName] || {
                        pathValue: node.pathValue
                    };
                    node = node[currentName];
                }
            }
            node.pathValue = path;
            this.pathCache = {};
        },
        getClassPath: function(name) {
            if (!this.pathCache[name]) {
                this.pathCache[name] = this.getPath(name) + name.replace(/\./gi, "/") + ".js";
                var basePath = this.getPath(name);
                var basePathIndex = basePath.length - 1;
                if (basePath.lastIndexOf("\\") !== basePathIndex && basePath.lastIndexOf("/") !== basePathIndex) {
                    basePath = basePath + "/";
                }
                this.pathCache[name] = basePath + name.replace(/\./gi, "/") + ".js";
            }
            return this.pathCache[name];
        },
        loadDeps: function(classObj, recording) {
            recording = recording || {};
            var deps = classObj.__deps;
            var namespace = classObj.__namespace;
            var unloadClass = [];
            for (var key in deps) {
                if (deps.hasOwnProperty(key) && deps[key]) {
                    var classFullName;
                    if (typeof deps[key] !== "string") {
                        classObj[key] = deps[key];
                        if (classObj[key] && classObj[key].__name) {
                            classFullName = classObj[key].__full;
                        }
                    } else {
                        classFullName = deps[key];
                        classObj[key] = this.find(classFullName);
                    }
                    if (!classFullName || recording[classFullName]) {
                        continue;
                    }
                    recording[classFullName] = true;
                    if (!classObj[key]) {
                        if (this.runtime === "node") {
                            try {
                                classObj[key] = require(this.getClassPath(classFullName));
                            } catch (ex) {
                                unloadClass.push(classFullName);
                            }
                        }
                        if (!classObj[key]) {
                            unloadClass.push(classFullName);
                        }
                    } else {
                        if (classObj[key].__deps) {
                            unloadClass = unloadClass.concat(this.loadDeps(classObj[key], recording));
                        }
                    }
                }
            }
            return unloadClass;
        },
        fastClone: function(source) {
            var Temp = function() {};
            Temp.prototype = source;
            var result = new Temp();
            return result;
        },
        deepClone: function(source, depth) {
            if (typeof depth !== "number") {
                depth = 10;
            }
            var to;
            var nextDepth = depth - 1;
            if (depth > 0) {
                if (source instanceof Date) {
                    to = new Date();
                    to.setTime(source.getTime());
                } else if (source instanceof Array) {
                    to = [];
                    for (var i = 0, count = source.length; i < count; i++) {
                        to[i] = this.deepClone(source[i], nextDepth);
                    }
                } else if (typeof source === "object") {
                    to = {};
                    for (var key in source) {
                        if (source.hasOwnProperty(key)) {
                            var item = source[key];
                            to[key] = this.deepClone(item, nextDepth);
                        }
                    }
                } else {
                    to = source;
                }
            } else {
                to = source;
            }
            return to;
        },
        proxy: function(context, method) {
            var thisArgs = Array.prototype.slice.apply(arguments);
            var thisObj = thisArgs.shift();
            var thisMethod = typeof this === "function" ? this : thisArgs.shift();
            return function() {
                var tempArgs = Array.prototype.slice.apply(arguments);
                return thisMethod.apply(thisObj, tempArgs.concat(thisArgs));
            };
        },
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
        reload: function(name) {
            var result = this.find(name);
            if (result) {
                result.__registed = false;
                if (this.runtime === "node") {
                    var classPath = this.getClassPath(name);
                    delete require.cache[require.resolve(classPath)];
                    result = require(classPath);
                } else {
                    result = this.define(result);
                }
            } else {
                result = this.using(name);
            }
            return result;
        },
        create: function(classObj, p1, p2, p3, p4, p5) {
            if (typeof classObj === "string") {
                classObj = this.using(classObj);
            }
            var result = new classObj.__constructor(p1, p2, p3, p4, p5);
            return result;
        },
        using: function(name) {
            var result = this.find(name);
            if (!result) {
                if (this.runtime === "node") {
                    require(this.getClassPath(name));
                    result = this.find(name);
                }
            }
            return result;
        },
        define: function(classObj) {
            var name = classObj.name || "__tempName";
            var namespace = classObj.namespace || "";
            classObj.__name = name;
            classObj.__namespace = namespace;
            classObj.__full = namespace.length > 1 ? namespace + "." + name : name;
            classObj.__deps = classObj.deps;
            classObj.__oojs = this;
            classObj.__constructor = function(p1, p2, p3, p4, p5) {
                if (this.__clones && this.__clones.length > 0) {
                    for (var i = 0, count = this.__clones.length; i < count; i++) {
                        var key = this.__clones[i];
                        this[key] = this.__oojs.deepClone(this[key]);
                    }
                }
                this.__constructorSource(p1, p2, p3, p4, p5);
            };
            classObj.__constructorSource = classObj[name] || this.noop;
            classObj.__staticSource = classObj["$" + name] || this.noop;
            classObj.__staticUpdate = function() {
                var needCloneKeyArray = [];
                for (var key in this) {
                    if (this.hasOwnProperty(key)) {
                        var item = this[key];
                        if (typeof item === "object" && item !== null && key !== "deps" && key.indexOf("__") !== 0 && (!classObj.__deps || !classObj.__deps[key])) {
                            needCloneKeyArray.push(key);
                        }
                    }
                }
                this.__clones = needCloneKeyArray;
                this.__constructor.prototype = this;
            };
            classObj.__static = function() {
                this.__staticSource();
                this.__staticUpdate();
            };
            var isRegisted = false;
            var isPartClass = false;
            var preNamespaces = namespace.split(".");
            var count = preNamespaces.length;
            var currentClassObj = this.classes;
            var tempName;
            for (var i = 0; i < count; i++) {
                tempName = preNamespaces[i];
                if (tempName) {
                    currentClassObj[tempName] = currentClassObj[tempName] || {};
                    currentClassObj = currentClassObj[tempName];
                }
            }
            currentClassObj[name] = currentClassObj[name] || {};
            var currentNamespace = currentClassObj;
            currentClassObj = currentClassObj[name];
            if (!currentClassObj.__name || !currentClassObj.__registed) {
                classObj.__registed = true;
                currentNamespace[name] = classObj;
            } else if (currentClassObj.__registed) {
                isRegisted = true;
                for (var key in classObj) {
                    if (key && classObj.hasOwnProperty(key) && (typeof currentClassObj[key] === "undefined" || currentClassObj[key] === this.noop)) {
                        isPartClass = true;
                        currentClassObj[key] = classObj[key];
                    }
                }
            }
            classObj = currentNamespace[name];
            if (!isRegisted || isPartClass) {
                var unloadClass = this.loadDeps(classObj);
                if (unloadClass.length > 0) {
                    this.loader = this.loader || this.using("oojs.loader");
                    if (this.runtime === "browser" && this.loader) {
                        this.loader.loadDepsBrowser(classObj, unloadClass);
                    } else {
                        throw new Error('class "' + classObj.name + '"' + " loadDeps error:" + unloadClass.join(","));
                    }
                } else {
                    classObj.__static();
                }
            }
            if (this.runtime === "node" && arguments.callee.caller.arguments[2]) {
                arguments.callee.caller.arguments[2].exports = classObj;
            }
            return classObj;
        }
    };
    oojs.define(oojs);
})();

oojs.define({
    name: "event",
    namespace: "oojs",
    eventList: null,
    groupList: null,
    $event: function() {},
    event: function() {
        this.eventList = {};
        this.groupList = {};
        this.eventGroupIndexer = {};
    },
    createCallback: function(callback, needTimes, emitTimes) {
        callback = typeof callback !== "undefined" ? callback : function() {};
        needTimes = typeof needTimes !== "undefined" ? needTimes : -1;
        emitTimes = typeof emitTimes !== "undefined" ? emitTimes : 0;
        return {
            callback: callback,
            data: null,
            needTimes: needTimes,
            emitTimes: emitTimes
        };
    },
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
    bind: function(eventName, callback, times) {
        var ev = this.eventList[eventName] = this.eventList[eventName] || this.createEvent(eventName);
        ev.callbacks.push(this.createCallback(callback, times));
        if (ev.status && ev.emitData.length) {
            for (var i = 0, count = ev.emitData.length; i < count; i++) {
                this.emit(ev.name, ev.emitData[i]);
            }
            ev.emitData = [];
        }
        return this;
    },
    unbind: function(eventName, callback) {
        if (!eventName && !callback) {
            for (var key in this.eventList) {
                if (key && this.eventList[key] && this.eventList.hasOwnProperty(key)) {
                    this.unbind(key);
                }
            }
        } else {
            var eventItem = this.eventList[eventName];
            if (eventItem && eventItem.callbacks && eventItem.callbacks.length) {
                for (var i = 0, count = eventItem.callbacks.length; i < count; i++) {
                    if (callback) {
                        if (eventItem.callbacks[i].callback === callback) {
                            eventItem.callbacks[i].callback = null;
                            eventItem.callbacks[i].needTimes = 0;
                        }
                    } else {
                        eventItem.callbacks[i].callback = null;
                        eventItem.callbacks[i].needTimes = 0;
                    }
                }
            }
        }
    },
    emit: function(eventName, data) {
        var ev = this.eventList[eventName] = this.eventList[eventName] || this.createEvent(eventName);
        ev.status = true;
        if (!ev.callbacks || !ev.callbacks.length) {
            ev.emitData.push(data);
        } else {
            if (ev.callbacks && ev.callbacks.length) {
                for (var i = 0, count = ev.callbacks.length; i < count; i++) {
                    var callbackItem = ev.callbacks[i];
                    var callbackFunction = callbackItem.callback;
                    var needRun = false;
                    if (callbackItem.needTimes === -1) {
                        needRun = true;
                    } else {
                        if (callbackItem.needTimes > 0 && callbackItem.emitTimes < callbackItem.needTimes) {
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
        for (var groupName in ev.groups) {
            if (groupName && ev.groups.hasOwnProperty(groupName) && ev.groups[groupName]) {
                this.groupEmit(groupName);
            }
        }
        return this;
    },
    group: function(groupName, eventNames, callback, times) {
        var group = this.groupList[groupName] = this.groupList[groupName] || this.createGroup(groupName);
        if (callback) {
            callback = callback instanceof Array ? callback : [ callback ];
            for (var i = 0, count = callback.length; i < count; i++) {
                group.callbacks.push(this.createCallback(callback[i], times));
            }
        }
        var eventName;
        eventNames = typeof eventNames === "string" ? [ eventNames ] : eventNames;
        for (var i = 0, count = eventNames.length; i < count; i++) {
            eventName = eventNames[i];
            if (!group.events[eventName]) {
                group.status = false;
                var ev = this.eventList[eventName] = this.eventList[eventName] || this.createEvent(eventName);
                ev.groups[groupName] = 1;
                group.events[eventName] = 1;
            }
        }
        if (eventNames.length > 0) {
            this.groupEmit(groupName);
        }
        return this;
    },
    groupEmit: function(groupName) {
        var group = this.groupList[groupName] = this.groupList[groupName] || this.createGroup(groupName);
        var afterGroups = group.afterGroups;
        var afterGroupFinished = true;
        for (var afterGroupName in afterGroups) {
            if (afterGroupName && afterGroups.hasOwnProperty(afterGroupName)) {
                if (this.groupList[afterGroupName]) {
                    if (!this.groupList[afterGroupName].status) {
                        afterGroupFinished = false;
                    }
                }
            }
        }
        if (!afterGroupFinished) {
            return this;
        }
        var events = group.events;
        var eventFinished = true;
        var ev;
        for (var eventName in events) {
            if (eventName && events.hasOwnProperty(eventName) && events[eventName]) {
                ev = this.eventList[eventName] = this.eventList[eventName] || this.createEvent(eventName);
                if (!ev.status) {
                    eventFinished = false;
                    break;
                }
            }
        }
        if (eventFinished) {
            group.status = true;
            var eventCallbackData = {};
            for (var eventName in events) {
                if (eventName && events.hasOwnProperty(eventName) && events[eventName]) {
                    var callbacks = this.eventList[eventName].callbacks;
                    eventCallbackData[eventName] = [];
                    for (var i = 0, count = callbacks.length; i < count; i++) {
                        eventCallbackData[eventName].push(callbacks[i].data);
                    }
                    if (eventCallbackData[eventName].length === 1) {
                        eventCallbackData[eventName] = eventCallbackData[eventName][0];
                    }
                }
            }
            if (group.callbacks && group.callbacks.length) {
                for (var i = 0, count = group.callbacks.length; i < count; i++) {
                    var callbackItem = group.callbacks[i];
                    var callbackFunction = callbackItem.callback;
                    var needRun = false;
                    if (callbackItem.needTimes === -1) {
                        needRun = true;
                    } else {
                        if (callbackItem.needTimes > 0 && callbackItem.emitTimes < callbackItem.needTimes) {
                            needRun = true;
                        }
                    }
                    callbackItem.emitTimes++;
                    if (needRun && callbackFunction) {
                        callbackItem.data = callbackFunction(eventCallbackData);
                    }
                }
            }
            var previousGroups = group.previousGroups;
            for (var previousGroupName in previousGroups) {
                if (previousGroupName && previousGroups.hasOwnProperty(previousGroupName)) {
                    this.groupEmit(previousGroupName);
                }
            }
        }
        return this;
    },
    queue: function(previousGroupName, nextGroupName) {
        var args = Array.prototype.slice.apply(arguments);
        var previousGroups;
        var nextGroups;
        for (var i = 1, count = args.length; i < count; i++) {
            previousGroups = args[i - 1];
            nextGroups = args[i];
            previousGroups = previousGroups instanceof Array ? previousGroups : [ previousGroups ];
            nextGroups = nextGroups instanceof Array ? nextGroups : [ nextGroups ];
            for (var j = 0, jcount = previousGroups.length; j < jcount; j++) {
                var previousGroupName = previousGroups[j];
                this.groupList[previousGroupName] = this.groupList[previousGroupName] || this.createGroup(previousGroupName);
                var previousGroup = this.groupList[previousGroupName];
                for (var k = 0, kcount = nextGroups.length; k < kcount; k++) {
                    var nextGroupName = nextGroups[k];
                    this.groupList[nextGroupName] = this.groupList[nextGroupName] || this.createGroup(nextGroupName);
                    var nextGroup = this.groupList[nextGroupName];
                    previousGroup.afterGroups[nextGroupName] = 1;
                    nextGroup.previousGroups[previousGroupName] = 1;
                }
            }
        }
    }
});

oojs.define({
    name: "promise",
    namespace: "oojs",
    deps: {
        event: "oojs.event"
    },
    promise: function(func) {
        this.ev = oojs.create(this.event);
        if (func) {
            try {
                func(oojs.proxy(this, this._resolve), oojs.proxy(this, this._reject));
            } catch (ex) {
                this._reject(ex);
            }
        }
    },
    status: "pending",
    data: null,
    ev: null,
    defaultFunc: function(data) {
        return data;
    },
    _resolve: function(data) {
        if (data && typeof data.then === "function") {
            var insidePromise = data;
            var onFullfulled = oojs.proxy(this, function(data) {
                this._resolve(data);
            });
            var onRejected = oojs.proxy(this, function(data) {
                this._reject(data);
            });
            insidePromise.then(onFullfulled, onRejected);
        } else {
            this.status = "fulfilled";
            this.data = data;
            if (this.ev.eventList && this.ev.eventList["onRejected"]) {
                try {
                    this.ev.emit("onFulfilled", data);
                } catch (ex) {
                    this._reject(ex);
                }
            }
        }
    },
    resolve: function(data) {
        var promise = oojs.create(this);
        promise._resolve(data);
        return promise;
    },
    _reject: function(data) {
        this.status = "rejected";
        this.data = data;
        if (this.ev.eventList && this.ev.eventList["onRejected"]) {
            this.ev.emit("onRejected", data);
        }
        return data;
    },
    reject: function(data) {
        var promise = oojs.create(this);
        promise._reject(data);
        return promise;
    },
    promisify: function(func, thisObj) {
        var result = function() {
            var promise = oojs.create("oojs.promise");
            var args = Array.prototype.slice.apply(arguments);
            var callback = function(err) {
                if (err) {
                    this._reject(err);
                } else {
                    var returnDataArray = Array.prototype.slice.call(arguments, 1);
                    if (returnDataArray.length <= 1) {
                        returnDataArray = returnDataArray[0];
                    }
                    this._resolve(returnDataArray);
                }
            };
            args.push(oojs.proxy(promise, callback));
            func.apply(thisObj, args);
            return promise;
        };
        return result;
    },
    then: function(onFulfilled, onRejected) {
        onFulfilled = onFulfilled || this.defaultFunc;
        onRejected = onRejected || this.defaultFunc;
        var promise = oojs.create("oojs.promise");
        var promiseResolveCallback = oojs.proxy(promise, function(data) {
            this._resolve(data["onFulfilled"]);
        });
        var promiseRejectCallback = oojs.proxy(promise, function(data) {
            this._reject(data["onRejected"]);
        });
        this.ev.bind("onFulfilled", onFulfilled);
        this.ev.group("onFulfilledGroup", "onFulfilled", promiseResolveCallback);
        this.ev.bind("onRejected", onRejected);
        this.ev.group("onRejectedGroup", "onRejected", promiseRejectCallback);
        if (this.status === "fulfilled") {
            setTimeout(oojs.proxy(this, function() {
                this._resolve(this.data);
            }), 0);
        } else if (this.status === "rejected") {
            setTimeout(oojs.proxy(this, function() {
                this._reject(this.data);
            }), 0);
        }
        return promise;
    },
    "catch": function(onRejected) {
        this.then(null, onRejected);
    },
    all: function(promiseArray) {
        var promise = oojs.create(this);
        var ev = oojs.create("oojs.event");
        ev.bind("error", oojs.proxy(promise, function(error) {
            this._reject(error);
        }));
        var eventGroup = [];
        for (var i = 0, count = promiseArray.length; i < count; i++) {
            var tempEventName = "event-" + (i + 1);
            eventGroup.push(tempEventName);
            var tempPromise = promiseArray[i];
            tempPromise.__eventName = tempEventName;
            tempPromise.allEvent = ev;
            ev.bind(tempEventName, function(data) {
                return data;
            });
            var tempPromiseOnFullfilled = function(data) {
                this.allEvent.emit(this.__eventName, data);
            }.proxy(tempPromise);
            var tempPromiseOnRejected = function(error) {
                this.allEvent.emit("error", error);
                this.allEvent.unbind();
            }.proxy(tempPromise);
            tempPromise.then(tempPromiseOnFullfilled, tempPromiseOnRejected);
        }
        ev.group("all", eventGroup, function(data) {
            var promiseData = [];
            for (var key in data) {
                promiseData.push(data[key]);
            }
            this._resolve(promiseData);
        }.proxy(promise));
        return promise;
    },
    race: function(promiseArray) {
        var promise = oojs.create(this);
        var ev = oojs.create("oojs.event");
        ev.bind("success", oojs.proxy(promise, function(data) {
            this._resolve(data);
        }));
        ev.bind("error", oojs.proxy(promise, function(error) {
            this._reject(error);
        }));
        var eventGroup = [];
        for (var i = 0, count = promiseArray.length; i < count; i++) {
            var tempEventName = "event-" + (i + 1);
            eventGroup.push(tempEventName);
            var tempPromise = promiseArray[i];
            var tempPromiseOnFullfilled = function(data) {
                this.emit("success", data);
                this.unbind();
            }.proxy(ev);
            var tempPromiseOnRejected = function(error) {
                this.emit("error", error);
                this.unbind();
            }.proxy(ev);
            tempPromise.then(tempPromiseOnFullfilled, tempPromiseOnRejected);
        }
        return promise;
    }
});

oojs.define({
    name: "loader",
    namespace: "oojs",
    deps: {
        event: "oojs.event"
    },
    $loader: function() {
        this.ev = oojs.create(this.event);
    },
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
        this.loading = this.loading || {};
        if (this.loading[url]) {
            return;
        }
        this.loading[url] = 1;
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
    loadDepsBrowser: function(classObj, unloadClassArray) {
        var parentFullClassName = classObj.__full;
        if (!this.ev.groupList[parentFullClassName]) {
            this.ev.group(parentFullClassName, [], function() {
                oojs.reload(parentFullClassName);
            });
        }
        for (var i = 0, count = unloadClassArray.length; i < count; i++) {
            var classFullName = unloadClassArray[i];
            if (!this.ev.eventList[classFullName]) {
                this.ev.bind(classFullName, function() {
                    return true;
                });
            }
            this.ev.group(parentFullClassName, classFullName);
            if (!this.ev.groupList[classFullName]) {
                this.ev.group(classFullName, [], function(data, className) {
                    oojs.reload(className);
                }.proxy(this, classFullName));
                this.ev.groupList[classFullName].status = true;
            }
            this.ev.queue(parentFullClassName, classFullName);
            var url = oojs.getClassPath(classFullName);
            var jsCallBack = oojs.proxy(this, function(classFullName) {
                this.ev.emit(classFullName, classFullName);
            }, classFullName);
            this.loadScript(url, jsCallBack);
        }
        return this;
    }
});