oojs.define({

    /**
     * 类加载器. 使用oojs.event实现.
     * 当类A以类B, 类B依赖类C时, 会递归加载所有的依赖类, 当所有的依赖类都加载完毕后, 执行类A的静态构造函数.
     */
    name: 'loader',
    namespace: 'oojs',
    deps: {
        event: 'oojs.event'

    },
    $loader: function () {
        this.ev = oojs.create(this.event);
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
        if (typeof version === 'function') {
            callback = version;
            version = '1.0.0';
        }
        version = version || '1.0.0';

        if (version) {
            url += '?v=' + version;
        }

        callback = callback || function () {
            };

        // loading对象记录已经加载过的日志, 保证一个地址不会被加载多次
        this.loading = this.loading || {};
        if (this.loading[url]) {
            return;
        }
        this.loading[url] = 1;

        // 加载脚本
        var loader = document.createElement('script');
        loader.type = 'text/javascript';
        loader.async = true;

        loader.src = url;
        loader.onload = loader.onerror = loader.onreadystatechange = function (e) {
            if (/loaded|complete|undefined/.test(loader.readyState)) {
                loader.onload = loader.onerror = loader.onreadystatechange = null;
                loader = undefined;
                callback();
            }
        };
        var s = document.getElementsByTagName('script')[0];
        s.parentNode.insertBefore(loader, s);
        return this;
    },

    /**
     * 浏览器加载类依赖
     * @public
     * @param {object} classObj 类对象
     * @return {object} oojs对象引用
     */
    loadDepsBrowser: function (classObj, unloadClassArray) {
        // 创建入口类事件组
        var parentFullClassName = classObj.__full;

        if (!this.ev.groupList[parentFullClassName]) {
            this.ev.group(parentFullClassName, [], function () {
                oojs.reload(parentFullClassName);
            });
        }

        // 处理依赖
        for (var i = 0, count = unloadClassArray.length; i < count; i++) {
            var classFullName = unloadClassArray[i];
            // 绑定事件
            if (!this.ev.eventList[classFullName]) {
                this.ev.bind(classFullName, function () {
                    return true;
                });
            }

            // 添加到父类分组中
            this.ev.group(parentFullClassName, classFullName);

            // 为每一个依赖类创建一个group
            if (!this.ev.groupList[classFullName]) {
                this.ev.group(classFullName, [], function (data, className) {
                    oojs.reload(className);
                }.proxy(this, classFullName));
                this.ev.groupList[classFullName].status = true;
            }

            // 创建队列
            this.ev.queue(parentFullClassName, classFullName);

            // 加载脚本
            var url = oojs.getClassPath(classFullName);
            var jsCallBack = oojs.proxy(this, function (classFullName) {
                this.ev.emit(classFullName, classFullName);
            }, classFullName);
            this.loadScript(url, jsCallBack);

        }
        return this;
    }

});
