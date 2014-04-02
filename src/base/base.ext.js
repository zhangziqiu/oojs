define && define({
    name: "base",
    namespace: "",
    $base : function(){
        this.ev = base.using('base.utility.event');
    },
    classType: "extend", //扩展类
    loadDeps: function (classObj) {
        var deps = classObj.deps;
        if (this.runtime === 'nodejs') {
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
                            return base.using(classFullName);
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
                        var loader = document.createElement("script");
                        loader.type = "text/javascript";
                        loader.async = true;
                        var url = classFullName.replace(/\./gi, "/") + ".js";
                        url = "../src/" + url;
                        loader.src = url.toLowerCase();
                        loader.onload = loader.onerror = loader.onreadystatechange = (function () {
                            if (/loaded|complete|undefined/.test(loader.readyState)) {
                                //脚本加载完毕后, 触发事件
                                this.ev.emit(classFullName);
                                loader.onload = loader.onerror = loader.onreadystatechange = null;
                                loader = undefined;
                            }
                        }).proxy(this);
                        var s = document.getElementsByTagName("script")[0];
                        s.parentNode.insertBefore(loader, s);
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