/**
 * @file promise类, 支持标准的promise模式
 * @author zhangziqiu@qq.com
 */

oojs.define({
    name: 'promise',
    namespace: 'oojs',
    deps: {
        event: 'oojs.event'
    },

    /**
     * 构造函数
     * @param {Function} func 函数签名为 func(resolve, reject)
     */
    promise: function (func) {
        this.ev = oojs.create(this.event);
        if (func) {
            try {
                func(oojs.proxy(this, this._resolve), oojs.proxy(this, this._reject));
            }
            catch (ex) {
                this._reject(ex);
            }
        }
    },

    // promise状态, 取值包括: fulfilled，rejected，pending
    status: 'pending',

    // onFulfilled 或者 onRejected 函数返回的数据.
    data: null,

    // oojs.event实例. 使用then函数时, 会为event对象注册OnFullfilled和OnRejected事件.
    ev: null,

    /**
     * OnFullfilled和OnRejected的默认值,直接返回传入的参数
     * @param {*} data 传递的参数
     * @return {*} 直接返回传入的data参数
     */
    defaultFunc: function (data) {
        return data;
    },

    /**
     * 变更状态为 fullfilled
     * @public
     * @param {*} data 传递的参数
     */
    _resolve: function (data) {
        // 返回的是一个thenable对象
        if (data && typeof data.then === 'function') {
            var insidePromise = data;
            var onFullfulled = oojs.proxy(this, function (data) {
                this._resolve(data);
            });
            var onRejected = oojs.proxy(this, function (data) {
                this._reject(data);
            });
            insidePromise.then(onFullfulled, onRejected);
        }
        // 返回的是非promise对象
        else {
            // 修改状态
            this.status = 'fulfilled';
            // 设置数据
            this.data = data;
            // 触发下一个then方法绑定的函数
            if (this.ev.eventList && this.ev.eventList['onRejected']) {
                try {
                    //如果then中绑定的onFulfilled函数出现异常, 则进行reject操作
                    this.ev.emit('onFulfilled', data);
                }
                catch (ex) {
                    this._reject(ex);
                }
            }
        }
    },

    /**
     * 返回一个状态为 fulfilled 的 promise对象。
     * @public
     * @param {*} data 传递的参数
     * @return {Object} promise对象
     */
    resolve: function (data) {
        var promise = oojs.create(this);
        promise._resolve(data);
        return promise;
    },

    /**
     * 变更状态为 rejected
     * @public
     * @param {*} data 传递的参数
     */
    _reject: function (data) {
        this.status = 'rejected';
        this.data = data;
        if (this.ev.eventList && this.ev.eventList['onRejected']) {
            this.ev.emit('onRejected', data);
        }
        return data;
    },

    /**
     * 返回一个状态为 rejected 的 promise对象。
     * @public
     * @param {*} data 传递的参数
     * @return {Object} promise对象
     */
    reject: function (data) {
        var promise = oojs.create(this);
        promise._reject(data);
        return promise;
    },

    /**
     * 将node中的回调函数形式,即callback为最后一个形式参数的函数, 变成promise形式的函数.
     * 比如将node自带模块fs的readFile函数, 变成promise形式的函数:
     *      var readFilePromise = promise.promisify(fs.readFile);
     *      readFilePromise('test.txt').then(function(data){...});
     * @public
     * @param {Function} func node回调形式的函数
     * @param {Object} thisObj 函数调用时的this对象,可以不传递.
     * @return {Function}
     */
    promisify: function (func, thisObj) {
        var result = function () {
            var promise = oojs.create('oojs.promise');
            var args = Array.prototype.slice.apply(arguments);
            var callback = function (err) {
                if (err) {
                    this._reject(err);
                }
                else {
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
        }
        return result;
    },

    /**
     * 设置下一步成功（onFulfilled）或失败（onRejected）时的处理函数。返回新的promise对象用于链式调用。
     * @public
     * @param {Function} onFulfilled 成功时调用的函数
     * @param {Function} onRejected 失败时调用的函数
     * @return {Object} promise对象
     */
    then: function (onFulfilled, onRejected) {
        onFulfilled = onFulfilled || this.defaultFunc;
        onRejected = onRejected || this.defaultFunc;

        // 创建一个新的promise并返回
        var promise = oojs.create('oojs.promise');
        var promiseResolveCallback = oojs.proxy(promise, function (data) {
            this._resolve(data['onFulfilled']);
        });
        var promiseRejectCallback = oojs.proxy(promise, function (data) {
            this._reject(data['onRejected']);
        });

        this.ev.bind('onFulfilled', onFulfilled);
        this.ev.group('onFulfilledGroup', 'onFulfilled', promiseResolveCallback);
        this.ev.bind('onRejected', onRejected);
        this.ev.group('onRejectedGroup', 'onRejected', promiseRejectCallback);

        // 检测当前的promise是否已经执行完毕
        if (this.status === 'fulfilled') {
            setTimeout(oojs.proxy(this, function () {
                this._resolve(this.data);
            }), 0);

        }
        else if (this.status === 'rejected') {
            setTimeout(oojs.proxy(this, function () {
                this._reject(this.data);
            }), 0);
        }

        //返回新创建的promise
        return promise;
    },

    /**
     * 设置失败时的处理函数 onRejected, 返回新的promise对象用于链式调用。
     * 等同于: then(null, onRejected)
     * @public
     * @param {Function} onRejected 失败时调用的函数
     * @return {oojs.promise} promise对象
     */
    catch: function (onRejected) {
        this.then(null, onRejected);
    },

    /**
     * 传入promise对象数组，数组中的所有promise对象都完成时，就设置返回的promise为onFullFilled
     * @public
     * @param {Array} promiseArray promise对象数组
     * @return {oojs.promise} promise对象
     */
    all: function (promiseArray) {
        var promise = oojs.create(this);
        var ev = oojs.create('oojs.event');
        ev.bind('error', oojs.proxy(promise, function (error) {
            this._reject(error);
        }));

        var eventGroup = [];
        for (var i = 0, count = promiseArray.length; i < count; i++) {
            var tempEventName = 'event-' + (i + 1);
            eventGroup.push(tempEventName);
            var tempPromise = promiseArray[i];
            tempPromise.__eventName = tempEventName;
            tempPromise.allEvent = ev;
            ev.bind(tempEventName, function (data) {
                return data;
            });

            var tempPromiseOnFullfilled = function (data) {
                this.allEvent.emit(this.__eventName, data);
            }.proxy(tempPromise);
            var tempPromiseOnRejected = function (error) {
                this.allEvent.emit('error', error);
                this.allEvent.unbind();
            }.proxy(tempPromise);

            tempPromise.then(tempPromiseOnFullfilled, tempPromiseOnRejected);
        }

        ev.group('all', eventGroup, function (data) {
            var promiseData = [];
            for (var key in data) {
                promiseData.push(data[key]);
            }
            this._resolve(promiseData);
        }.proxy(promise));

        return promise;
    },

    /**
     * 传入promise对象数组，数组中的所有promise对象只要有一个完成时，就设置返回的promise为onFullFilled
     * @public
     * @param {Array} promiseArray promise对象数组
     * @return {oojs.promise} promise对象
     */
    race: function (promiseArray) {
        var promise = oojs.create(this);
        var ev = oojs.create('oojs.event');
        ev.bind('success', oojs.proxy(promise, function (data) {
            this._resolve(data);
        }));
        ev.bind('error', oojs.proxy(promise, function (error) {
            this._reject(error);
        }));

        var eventGroup = [];
        for (var i = 0, count = promiseArray.length; i < count; i++) {
            var tempEventName = 'event-' + (i + 1);
            eventGroup.push(tempEventName);
            var tempPromise = promiseArray[i];
            var tempPromiseOnFullfilled = function (data) {
                this.emit('success', data);
                this.unbind();
            }.proxy(ev);
            var tempPromiseOnRejected = function (error) {
                this.emit('error', error);
                this.unbind();
            }.proxy(ev);
            tempPromise.then(tempPromiseOnFullfilled, tempPromiseOnRejected);
        }
        return promise;
    }

});