define && define({
    name: "oojs",
    namespace: "",
    classType: "extend", //扩展类
    $oojs: function () {
        this.ev = oojs.using('oojs.event');
    },
    loadScript: function (url, callback) {
        //加载脚本
        var loader = document.createElement("script");
        loader.type = "text/javascript";
        loader.async = true;
        loader.src = url;
        loader.onload = loader.onerror = loader.onreadystatechange = (function () {
            if (/loaded|complete|undefined/.test(loader.readyState)) {
                loader.onload = loader.onerror = loader.onreadystatechange = null;
                loader = undefined;
                //脚本加载完毕后, 触发事件
                callback();
            }
        }).proxy(this);
        var s = document.getElementsByTagName("script")[0];
        s.parentNode.insertBefore(loader, s);
    },

    loadDeps: function (classObj) {
        var deps = classObj.deps;
        if (this.runtime === 'nodejs') {
            var deps = classObj.deps;
            for (var key in deps) {
                if (key && deps.hasOwnProperty(key)) {
                    classObj[key] = require(this.getClassPath(deps[key]));
                }
            }

            var staticConstructorName = "$" + classObj.name;
            classObj[staticConstructorName] && classObj[staticConstructorName]();
        }
        else {
            if (deps) {
                for (var key in deps) {
                    if (key && deps.hasOwnProperty(key)) {
                        var classFullName = deps[key];

                        //绑定事件
                        this.ev.bind(classFullName, function (data) {
                            return oojs.using(classFullName);
                        });

                        //创建事件组
                        this.ev.group('loadDeps', [classFullName], function (data) {
                            classObj[key] = data[classFullName][0];
                        });

                        //事件组执行完毕后的事件钩子
                        this.ev.afterGroup('loadDeps', function () {
                            //运行静态构造函数
                            var staticConstructorName = "$" + classObj.name;
                            classObj[staticConstructorName] && classObj[staticConstructorName]();
                        });

                        //加载脚本
                        var url = this.basePath + classFullName.replace(/\./gi, "/") + ".js";
                        var jsCallBack = function () {
                                this.ev.emit(classFullName);
                            }.proxy(this);
                        this.loadScript(url, jsCallBack);
                    }
                }
            }
            else {
                //运行静态构造函数
                classObj[staticConstructorName] && classObj[staticConstructorName]();
            }
        }

    }
})