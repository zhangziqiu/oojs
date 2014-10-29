define && define({
    /**
     * 类加载器. 使用oojs.event实现. 
     * 当类A以类B, 类B依赖类C时, 会递归加载所有的依赖类, 当所有的依赖类都加载完毕后, 执行类A的静态构造函数.
     */
    name: "oojs",
    namespace: "",
    $oojs: function () {
        this.ev = oojs.create(oojs.event);
    },
    /**
     * 判断是否空对象
     * @param {object} obj 待验证对象     
     * @param {boolean} 是否为空对象
     */
    isNullObj: function (obj) {
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
    loadScript: function (url, version, callback) {
        if (typeof version === "function") {
            callback = version;
            version = '1.0.0';
        }
        version = version || '1.0.0';

        if (url.indexOf('http') < 0) {
            url = this.basePath + url.replace(/\./g, "/") + ".js";
        }
        if (version) {
            url += "?v=" + version;
        }

        callback = callback || function () {};
        this.ev.bind(url, function (data, callback) {
            callback && callback();
        }.proxy(this, callback));

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
        loader.onload = loader.onerror = loader.onreadystatechange = function (e, url, loader) {
            if (typeof e === 'string') {
                url = e;
                loader = url;
            }

            if (/loaded|complete|undefined/.test(loader.readyState)) {
                loader.onload = loader.onerror = loader.onreadystatechange = null;
                loader = undefined;
                //脚本加载完毕后, 触发事件
                this.ev.emit(url, 1);
            }
        }.proxy(this, url, loader);

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
    loadDepsBrowser: function (classObj) {
        var deps = classObj.deps;
        var staticConstructorName = "$" + classObj.name;

        if (!this.isNullObj(deps)) {
            for (var key in deps) {
                if (key && deps.hasOwnProperty(key)) {
                    var classFullName = deps[key];

                    //已经加载完毕的模块
                    var loadedClass = this.using(classFullName)
                    if (loadedClass) {
                        classObj[key] = loadedClass;
                        continue;
                    }

                    //绑定事件
                    this.ev.bind(classFullName, function (data, classFullName) {
                        return oojs.using(classFullName);
                    }.proxy(this, classFullName));

                    //创建事件组
                    this.ev.group('loadDeps', [classFullName], function (data, key, classFullName, classObj) {
                        classObj[key] = data[classFullName][0];
                    }.proxy(this, key, classFullName, classObj));

                    //事件组执行完毕后的事件钩子
                    this.ev.afterGroup('loadDeps', function (data, lassObj) {
                        //运行静态构造函数
                        var staticConstructorName = "$" + classObj.name;
                        classObj[staticConstructorName] && classObj[staticConstructorName]();
                    }.proxy(this, classObj));

                    //加载脚本
                    var url = this.basePath + classFullName.replace(/\./gi, "/") + ".js";
                    var jsCallBack = function (classFullName) {
                            this.ev.emit(classFullName);
                        }.proxy(this, classFullName);

                    this.loadScript(url, jsCallBack);
                }
            }
        }
        else {
            //运行静态构造函数
            classObj[staticConstructorName] && classObj[staticConstructorName]();
        }

        return this;
    }
})