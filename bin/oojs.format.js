(function() {
    var oojs = {
        name: "oojs",
        namespace: "",
        $oojs: function() {
            Function.prototype.proxy = function(context) {
                var method = this;
                var args = Array.prototype.slice.apply(arguments);
                var obj = args.shift();
                return function() {
                    var tempArgs = Array.prototype.slice.apply(arguments);
                    return method.apply(obj, tempArgs.concat(args));
                };
            };
            if (typeof window !== "undefined") {
                this.global = window;
                this.runtime = "browser";
                this.basePath = "http://cpro.baidustatic.cn/js/";
                this.version = "1.0.0";
                this.global.oojs = oojs;
                this.global.define = this.define.proxy(this);
            } else if (global) {
                this.basePath = process.cwd() + "/src/";
                this.global = global;
                this.runtime = "nodejs";
                global.oojs = oojs;
                global.define = this.define.proxy(this);
                var Module = module.constructor;
                var nativeWrap = Module.wrap;
                Module.wrap = function(script) {
                    script = script.replace(/define\s*&&\s*define\s*\(/gi, "define(module,");
                    return nativeWrap(script);
                };
                module.exports = this;
            }
        },
        fastClone: function(source) {
            var temp = function() {};
            temp.prototype = source;
            var result = new temp();
            return result;
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
            result.dispose = result.dispose || function() {};
            if (this.runtime === "browser") {
                if (window.addEventListener) {
                    window.addEventListener("unload", result.dispose.proxy(result), false);
                } else if (window.attachEvent) {
                    window.attachEvent("onunload", result.dispose.proxy(result));
                }
            }
            for (var classPropertyName in classObj) {
                var temp = classObj[classPropertyName];
                if (temp && classObj.hasOwnProperty(classPropertyName) && typeof temp === "object") {
                    result[classPropertyName] = this.fastClone(temp);
                }
            }
            result.instances = null;
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
            if (this.loadDeps && classObj && classObj.deps) {
                this.loadDeps(classObj);
            } else {
                var staticConstructorName = "$" + name;
                classObj[staticConstructorName] && classObj[staticConstructorName]();
            }
            if (module) {
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
                if (this.runtime === "nodejs") {
                    require(this.getClassPath(name));
                    result = this.find(name);
                }
            }
            return result;
        },
        getClassPath: function(name) {
            return this.basePath + name.replace(/\./gi, "/") + ".js";
        },
        config: function(option) {
            this.basePath = option.basePath || this.basePath;
            return this;
        }
    };
    oojs.define(typeof module !== "undefined" ? module : null, oojs);
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
                console.log(url);
                this.ev.emit(url, 1);
            }
        }.proxy(this, url, loader);
        var s = document.getElementsByTagName("script")[0];
        s.parentNode.insertBefore(loader, s);
        return this;
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
                            console.log(classFullName);
                            this.ev.emit(classFullName);
                        }.proxy(this, classFullName);
                        this.loadScript(url, jsCallBack);
                    }
                }
            } else {
                classObj[staticConstructorName] && classObj[staticConstructorName]();
            }
        }
        return this;
    }
});