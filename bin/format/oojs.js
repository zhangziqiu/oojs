(function() {
    var oojs = {
        name: "oojs",
        namespace: "",
        classes: {},
        $oojs: function(config) {
            config = config || {};
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
            } else if (!path) {
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
        config: function(config) {
            for (var key in obj) {
                if (key && obj.hasOwnProperty(key)) {
                    if (key === "path" || key === "basePath") {
                        this.setPath(obj[key]);
                    }
                }
            }
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
            var tempClassObj = function() {};
            tempClassObj.prototype = classObj;
            var result = new tempClassObj();
            for (var classPropertyName in classObj) {
                var temp = classObj[classPropertyName];
                if (temp && classObj.hasOwnProperty(classPropertyName) && typeof temp === "object") {
                    result[classPropertyName] = this.fastClone(temp);
                }
            }
            result[constructerName] = result[constructerName] || function() {};
            result[constructerName].apply(result, args);
            result.instances = null;
            return result;
        },
        define: function(classObj) {
            var name = classObj.name;
            var staticConstructorName = "$" + name;
            classObj.namespace = classObj.namespace || "";
            classObj.dispose = classObj.dispose || function() {};
            classObj["__" + name] = classObj[name] || function() {};
            var isRegisted = false;
            var isPartClass = false;
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
            currClassObj[name] = currClassObj[name] || {};
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
            classObj = currClassObj[name];
            if (!isRegisted || isPartClass) {
                var unloadClassArray = this.loadDeps(classObj);
                if (unloadClassArray.length > 0) {
                    this.loader = this.loader || this.using("oojs.loader");
                    if (this.runtime === "browser" && this.loader) {
                        this.loader.loadDepsBrowser(classObj);
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
    oojs.define(oojs);
})();

oojs.define({
    name: "event",
    namespace: "oojs",
    eventList: null,
    groupList: null,
    eventGroupIndexer: null,
    eventGroupIndexer: null,
    $event: function() {},
    event: function() {
        this.eventList = {};
        this.groupList = {};
        this.eventGroupIndexer = {};
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
    bind: function(eventName, times, callback) {
        if (arguments.length === 2) {
            callback = times;
            times = 1;
        }
        times = typeof times === "undefined" ? 1 : times;
        var ev = this.eventList[eventName] = this.eventList[eventName] || this.createEvent(eventName);
        if (ev.status) {
            callback(ev.emitData);
        } else {
            (ev.callbacks = ev.callbacks || []).push({
                callback: callback,
                needTimes: times,
                emitTimes: 0
            });
            ev.status = false;
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
        if (ev.callbacks && ev.callbacks.length) {
            var callbackCount = ev.callbacks.length;
            ev.callbackData = [];
            for (var i = 0; i < callbackCount; i++) {
                var callbackItem = ev.callbacks[i];
                var callbackFunction = callbackItem.callback;
                var needRun = false;
                if (callbackItem.needTimes === -1) {
                    needRun = true;
                } else if (callbackItem.needTimes > 0 && callbackItem.emitTimes < callbackItem.needTimes) {
                    needRun = true;
                }
                callbackItem.emitTimes++;
                if (needRun && callbackFunction) {
                    callbackItem.data = callbackFunction(data);
                }
            }
        }
        ev.status = true;
        ev.emitData = data || {};
        var groups = ev.groups || [];
        for (var i = 0, count = groups.length; i < count; i++) {
            var groupName = groups[i];
            if (groupName) {
                this.groupEmit(groupName);
            }
        }
    },
    group: function(groupName, eventNames, callback) {
        this.groupList[groupName] = this.groupList[groupName] || {};
        var group = this.groupList[groupName];
        var events = group.events = group.events || {};
        if (callback) {
            (group.callbacks = group.callbacks || []).push(callback);
        }
        var eventName, eventNames = eventNames || [];
        for (var i = 0, count = eventNames.length; i < count; i++) {
            eventName = eventNames[i];
            var ev = this.eventList[eventName] = this.eventList[eventName] || this.createEvent(eventName);
            ev.groups[groupName] = group;
            group.events[eventName] = 1;
        }
        this.groupEmit(groupName);
        return this;
    },
    groupEmit: function(groupName) {
        var group = this.groupList[groupName];
        var events = group.events = group.events || {};
        var groupFinished = true;
        var callbackData = {};
        var eventName, ev;
        for (eventName in events) {
            if (eventName && events.hasOwnProperty(eventName)) {
                ev = this.eventList[eventName];
                if (!ev || !ev.status) {
                    groupFinished = false;
                    callbackData = null;
                    break;
                } else {
                    callbackData[eventName] = ev.callbackData;
                }
            }
        }
        eventName = null;
        if (groupFinished) {
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
    isNullObj: function(obj) {
        for (var i in obj) {
            if (obj.hasOwnProperty(i)) {
                return false;
            }
        }
        return true;
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
        this.ev.bind(url, oojs.proxy(this, function(data, callback) {
            callback && callback();
        }, callback));
        this.loading = this.loading || {};
        if (this.loading[url]) {
            return;
        }
        this.loading[url] = 1;
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
                this.ev.emit(url, 1);
            }
        }, url, loader);
        var s = document.getElementsByTagName("script")[0];
        s.parentNode.insertBefore(loader, s);
        return this;
    },
    loadDepsBrowser: function(classObj) {
        var deps = classObj.deps;
        var staticConstructorName = "$" + classObj.name;
        if (!this.isNullObj(deps)) {
            for (var key in deps) {
                if (key && deps.hasOwnProperty(key)) {
                    var classFullName = deps[key];
                    var loadedClass = oojs.using(classFullName);
                    if (loadedClass) {
                        classObj[key] = loadedClass;
                        continue;
                    }
                    this.ev.bind(classFullName, function(data) {
                        var result = oojs.using(data.classFullName);
                        if (!result) {
                            throw new Error(data.classFullName + " load error in url: " + data.url);
                        }
                        return result;
                    });
                    this.ev.group("loadDeps", [ classFullName ], oojs.proxy(this, function(data, key, classFullName, classObj) {
                        classObj[key] = data[classFullName][0];
                    }, key, classFullName, classObj));
                    this.ev.afterGroup("loadDeps", oojs.proxy(this, function(data, classObj) {
                        var staticConstructorName = "$" + classObj.name;
                        classObj[staticConstructorName] && classObj[staticConstructorName]();
                    }, classObj));
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
            classObj[staticConstructorName] && classObj[staticConstructorName]();
        }
        return oojs;
    }
});