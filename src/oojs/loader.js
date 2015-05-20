oojs.define({
    /**
     * 类加载器. 使用oojs.event实现. 
     * 当类A以类B, 类B依赖类C时, 会递归加载所有的依赖类, 当所有的依赖类都加载完毕后, 执行类A的静态构造函数.
     */
    name: "loader",
    namespace: "oojs",
    deps:{
        event: 'oojs.event'
    },
    $loader:function(){
        this.ev = oojs.create( this.event );
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

        if (version) {
            url += "?v=" + version;
        }

        callback = callback || function () {};
        this.ev.bind(url,  oojs.proxy( this, function (data, callback) {
            callback && callback();
        }, callback));

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
        loader.onload = loader.onerror = loader.onreadystatechange = oojs.proxy(this, function (e, url, loader) {
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
    loadDepsBrowser: function (classObj) {
        var deps = classObj.deps;
        var staticConstructorName = "$" + classObj.name;

        if (!this.isNullObj(deps)) {
            for (var key in deps) {
                if (key && deps.hasOwnProperty(key)) {
                    var classFullName = deps[key];

                    //已经加载完毕的模块
                    var loadedClass = oojs.using(classFullName)
                    if (loadedClass) {
                        classObj[key] = loadedClass;
                        continue;
                    }

                    //绑定事件
                    this.ev.bind(classFullName, function (data) {						
						var result = oojs.using(data.classFullName);
						if( !result ){
							throw new Error(data.classFullName + ' load error in url: ' + data.url);
						}
                        return result;
                    });

                    //创建事件组
                    this.ev.group('loadDeps', [classFullName], oojs.proxy(this, function (data, key, classFullName, classObj) {
                        classObj[key] = data[classFullName][0];
                    }, key, classFullName, classObj));

                    //事件组执行完毕后的事件钩子
                    this.ev.afterGroup('loadDeps', oojs.proxy(this, function (data, classObj) {
                        //运行静态构造函数
                        var staticConstructorName = "$" + classObj.name;
                        classObj[staticConstructorName] && classObj[staticConstructorName]();
                    }, classObj));

                    //加载脚本
                    var url = oojs.getPath(classObj.namespace || "" + classObj.name); 
                    var jsCallBack = oojs.proxy(this, function (classFullName, url) {
                            this.ev.emit(classFullName, {class:classFullName, url:url});
                        }, classFullName, url);

                    this.loadScript(url, jsCallBack);
                }
            }
        }
        else {
            //运行静态构造函数
            classObj[staticConstructorName] && classObj[staticConstructorName]();
        }

        return oojs;
    }
});