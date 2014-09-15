(function() {
    var oojs = {
        name: "oojs",
        namespace: "",
        config: {
            global: false,
            proxyName: "proxy",
            basePath: ""
        },
        $oojs: function() {
            this.config = typeof $oojs_config !== "undefined" ? $oojs_config : this.config;
            var path = require("path");
            if (typeof window !== "undefined") {
                this.global = this.config.global || window;
                this.runtime = "browser";
                this.basePath = this.config.basePath;
            } else if (global) {
                this.global = this.config.global || global;
                this.runtime = "node";
                this.basePath = this.config.basePath ? path.resolve(this.config.basePath) : path.resolve(__dirname, "../../../src") + "/";
                var Module = module.constructor;
                var nativeWrap = Module.wrap;
                Module.wrap = function(script) {
                    script = script.replace(/define\s*&&\s*define\s*\(/gi, "define(module,");
                    return nativeWrap(script);
                };
                module.exports = this;
            }
            if (this.config.proxyName) {
                Function.prototype[this.config.proxyName] = this.proxy;
            }
            this.global.define = this.proxy(this, this.define);
            this.global.oojs = oojs;
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
        create: function(classObj, params) {
            var args = Array.prototype.slice.call(arguments, 0);
            args.shift();
            var constructerName = classObj.name || "init";
            var tempClassObj = function(args) {
                this[constructerName] = this[constructerName] || function() {};
                this[constructerName].apply(this, args);
            };
            tempClassObj.prototype = classObj;
            var result = new tempClassObj(args);
            for (var classPropertyName in classObj) {
                var temp = classObj[classPropertyName];
                if (temp && classObj.hasOwnProperty(classPropertyName) && typeof temp === "object") {
                    result[classPropertyName] = this.fastClone(temp);
                }
            }
            result.instances = null;
            return result;
        },
        inherit: function(childClass, parentClass) {
            childClass = typeof childClass === "string" ? this.using(childClass) : childClass;
            parentClass = typeof parentClass === "string" ? this.using(parentClass) : parentClass;
            for (var key in parentClass) {
                if (key && parentClass.hasOwnProperty(key) && !childClass.hasOwnProperty(key)) {
                    childClass[key] = parentClass[key];
                }
            }
        },
        loadDeps: function(classObj) {
            var deps = classObj.deps;
            var depsAllLoaded = true;
            for (var key in deps) {
                if (key && deps.hasOwnProperty(key) && deps[key]) {
                    var classFullName = deps[key];
                    classObj[key] = this.find(classFullName);
                    if (!classObj[key]) {
                        if (this.runtime === "node") {
                            classObj[key] = require(this.getClassPath(classFullName));
                        }
                        if (!classObj[key]) {
                            depsAllLoaded = false;
                        }
                    }
                }
            }
            return depsAllLoaded;
        },
        define: function(module, classObj) {
            if (!classObj) {
                classObj = module;
            }
            var name = classObj.name;
            classObj.namespace = classObj.namespace || "";
            classObj.dispose = classObj.dispose || function() {};
            var preNamespaces = classObj.namespace.split(".");
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
            currClassObj[name] = currClassObj[name] || {};
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
            var depsAllLoaded = this.loadDeps(classObj);
            if (!depsAllLoaded && this.runtime === "browser" && this.loadDepsBrowser) {
                this.loadDepsBrowser(classObj);
            } else {
                var staticConstructorName = "$" + name;
                classObj[staticConstructorName] && classObj[staticConstructorName]();
            }
            if (module && this.runtime === "node") {
                module.exports = classObj;
            }
            return this;
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
                if (this.runtime === "node") {
                    require(this.getClassPath(name));
                    result = this.find(name);
                }
            }
            return result;
        },
        getClassPath: function(name) {
            return this.basePath + name.replace(/\./gi, "/") + ".js";
        }
    };
    oojs.$oojs();
    oojs.define(typeof module !== "undefined" ? module : null, oojs);
    return oojs;
})();

define && define({
    name: "event",
    namespace: "oojs",
    eventList: null,
    groupList: null,
    eventGroupIndexer: null,
    $event: function() {},
    event: function() {
        this.eventList = {};
        this.groupList = {};
        this.eventGroupIndexer = {};
    },
    bind: function(eventName, callback) {
        var ev = this.eventList[eventName] = this.eventList[eventName] || {};
        (ev.callbacks = ev.callbacks || []).push(callback);
        ev.status = false;
        return this;
    },
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
        var groups = this.eventGroupIndexer[eventName] || [];
        for (var i = 0, count = groups.length, groupName; i < count; i++) {
            groupName = groups[i];
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
            events[eventName] = 1;
            (this.eventGroupIndexer[eventName] = this.eventGroupIndexer[eventName] || []).push(groupName);
        }
    },
    groupEmit: function(groupName) {
        var group = this.groupList[groupName];
        if (!group) return;
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
                    callbackData[eventName] = ev.data;
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

define && define({
    name: "oojs",
    namespace: "",
    classType: "extend",
    $oojs: function() {
        this.ev = oojs.create(oojs.event);
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
                this.ev.emit(url, 1);
            }
        }.proxy(this, url, loader);
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
                    var loadedClass = this.using(classFullName);
                    if (loadedClass) {
                        classObj[key] = loadedClass;
                        continue;
                    }
                    this.ev.bind(classFullName, function(data, classFullName) {
                        return oojs.using(classFullName);
                    }.proxy(this, classFullName));
                    this.ev.group("loadDeps", [ classFullName ], function(data, key, classFullName, classObj) {
                        classObj[key] = data[classFullName][0];
                    }.proxy(this, key, classFullName, classObj));
                    this.ev.afterGroup("loadDeps", function(data, lassObj) {
                        var staticConstructorName = "$" + classObj.name;
                        classObj[staticConstructorName] && classObj[staticConstructorName]();
                    }.proxy(this, classObj));
                    var url = this.basePath + classFullName.replace(/\./gi, "/") + ".js";
                    var jsCallBack = function(classFullName) {
                        this.ev.emit(classFullName);
                    }.proxy(this, classFullName);
                    this.loadScript(url, jsCallBack);
                }
            }
        } else {
            classObj[staticConstructorName] && classObj[staticConstructorName]();
        }
        return this;
    }
});