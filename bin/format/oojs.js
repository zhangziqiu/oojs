(function() {
    var oojs = {
        name: "oojs",
        namespace: "",
        classes: {},
        $oojs: function() {
            var config = {};
            if (typeof window !== "undefined" && typeof document !== "undefined") {
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
            this.global = config.global || {};
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
            return node._path;
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
                        _path: node._path
                    };
                    node = node[currentName];
                }
            }
            if (path && path.lastIndexOf("\\") !== path.length - 1 && path.lastIndexOf("/") !== path.length - 1) {
                path = path + "/";
            }
            node._path = path;
        },
        getClassPath: function(name) {
            if (!this.pathCache[name]) {
                this.pathCache[name] = this.getPath(name) + name.replace(/\./gi, "/") + ".js";
            }
            return this.pathCache[name];
        },
        loadDeps: function(classObj, recording) {
            recording = recording || {};
            var deps = classObj.deps;
            var unloadClassArray = [];
            for (var key in deps) {
                if (key && deps.hasOwnProperty(key) && deps[key]) {
                    var classFullName;
                    if (typeof deps[key] !== "string") {
                        classObj[key] = deps[key];
                        if (classObj[key] && classObj[key].name) {
                            classObj[key].namespace = classObj[key].namespace || "";
                            classFullName = classObj[key].namespace + classObj[key].name;
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
                            classObj[key] = require(this.getClassPath(classFullName));
                            if (!classObj[key]) {
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
        fastClone: function(source) {
            var temp = function() {};
            temp.prototype = source;
            var result = new temp();
            return result;
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
        create: function(classObj, params) {
            var args = Array.prototype.slice.call(arguments, 0);
            args.shift();
            if (typeof classObj === "string") {
                classObj = this.using(classObj);
            }
            if (!classObj || !classObj.name) {
                throw new Error("oojs.create need a class object with a name property");
            }
            var constructerName = "__" + classObj.name || "init";
            var classFunction = function() {};
            classFunction.prototype = classObj;
            var result = new classFunction();
            for (var key in classObj) {
                if (key && classObj.hasOwnProperty(key)) {
                    var item = classObj[key];
                    if (typeof item === "object") {
                        result[key] = this.fastClone(item);
                    }
                }
            }
            if (result[constructerName]) {
                result[constructerName].apply(result, args);
            }
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
            var name = classObj.name;
            var staticConstructorName = "$" + name;
            classObj.namespace = classObj.namespace || "";
            classObj.dispose = classObj.dispose || function() {};
            classObj["__" + name] = classObj[name] || function() {};
            classObj.__static_constructor = classObj[staticConstructorName] || function() {};
            var isRegisted = false;
            var isPartClass = false;
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
            currClassObj[name] = currClassObj[name] || {};
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
            classObj = currClassObj[name];
            if (!isRegisted || isPartClass) {
                var unloadClassArray = this.loadDeps(classObj);
                if (unloadClassArray.length > 0) {
                    this.loader = this.loader || this.using("oojs.loader");
                    if (this.runtime === "browser" && this.loader) {
                        this.loader.loadDepsBrowser(classObj, unloadClassArray);
                    } else {
                        throw new Error('class "' + classObj.name + '"' + " loadDeps error:" + unloadClassArray.join(","));
                    }
                } else {
                    classObj[staticConstructorName] && classObj[staticConstructorName]();
                }
            }
            if (this.runtime === "node" && arguments.callee.caller.arguments[2]) {
                arguments.callee.caller.arguments[2].exports = classObj;
            }
            return this;
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
        needTimes = typeof needTimes !== "undefined" ? needTimes : 1;
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
    bind: function(eventName, times, callback) {
        if (arguments.length === 2) {
            callback = times;
            times = 1;
        }
        times = typeof times !== "number" ? 1 : times;
        var ev = this.eventList[eventName] = this.eventList[eventName] || this.createEvent(eventName);
        callback = callback instanceof Array ? callback : [ callback ];
        for (var i = 0, count = callback.length; i < count; i++) {
            ev.callbacks.push(this.createCallback(callback[i], times));
        }
        if (ev.status && ev.emitData.length) {
            for (var i = 0, count = ev.emitData.length; i < count; i++) {
                this.emit(ev.name, ev.emitData[i]);
            }
            ev.emitData = [];
        }
        return this;
    },
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
    unbind: function(eventName, callback) {
        if (!eventName && !callback) {
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
    group: function(groupName, eventNames, callback) {
        var group = this.groupList[groupName] = this.groupList[groupName] || this.createGroup(groupName);
        if (callback) {
            callback = callback instanceof Array ? callback : [ callback ];
            for (var i = 0, count = callback.length; i < count; i++) {
                group.callbacks.push(this.createCallback(callback[i], 1));
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
                } else {
                    this.groupList[afterGroupName] = this.createGroup(afterGroupName);
                    afterGroupFinished = false;
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
    },
    afterGroup: function(groupName, callback) {
        var group = this.groupList[groupName] = this.groupList[groupName] || {};
        var afters = group.afters = group.afters || [];
        afters.push(callback);
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
        var parentFullClassName = classObj.namespace ? classObj.namespace + "." + classObj.name : classObj.name;
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
                console.log("event:" + classFullName);
                this.ev.emit(classFullName, classFullName);
            }, classFullName);
            this.loadScript(url, jsCallBack);
        }
        return this;
    }
});