define && define({
    /**
    event类用于处理事件. 自身使用oojs框架实现. 内部实现全部oo化.
    var ev = oojs.create(oojs.event, );
    单事件绑定:
    ev.bind('eventA', function(data){
        console.log(data);
    });
    ev.emit('eventA', 'I am A'); //output:I am A
    
    事件组绑定:
    ev.bind('eventA', function(data){
        console.log(data);
        return 'Hello ';
    });
    ev.bind('eventB', function(data){
        console.log(data);
        return 'world!';
    });
    //创建事件组, 只有当eventA和eventB都执行完成后, 才会调用事件组的回调函数
    ev.group('MyGroup', ['eventA', 'eventB'], function(data){
        dataA = data['eventA'];
        dataB = data['eventB'];
        console.log(dataA + dataB);
        console.log(dataB);
    });
    ev.emit('eventA', 'I am A'); //output:I am A
    ev.emit('eventB', 'I am B'); //output:I am B
    //output: Hello World!
    
     */
    name: "event",
    namespace: "oojs",
    /** 
    事件集合. 记录所有绑定的事件.
    格式为: 
    {
        eventName:{ 
            callbacks: [], 
            data:[], 
            afters:[], 
            status:false 
        }
    }
    */
    eventList: null,
    /** 
    事件组集合. 记录所有事件组的绑定关系
    格式为: 
        { 
            groupName:{
                events: {'eventName':times}, 
                callbacks: [], 
                afters: []
            } 
        }
    */
    groupList: null,
    /**
    事件组查询索引器. 
    */
    eventGroupIndexer: null,
    /**
     * 静态构造函数
     */
    $event: function () {

    },
    /**
     * 动态构造函数
     */
    event: function () {
        this.eventList = {};
        this.groupList = {};
        this.eventGroupIndexer = {};
    },
    /**
     * 为事件添加事件处理函数
     * @param {string} eventName 事件名     
     * @param {Function} callback 事件处理函数
     */
    bind: function (eventName, callback) {
        var ev = this.eventList[eventName] = this.eventList[eventName] || {};
        (ev.callbacks = ev.callbacks || []).push(callback);
        ev.status = false;
        return this;
    },
    /**
     * 为事件取消绑定事件处理函数
     * @param {string} eventName 事件名     
     * @param {Function} callback 事件处理函数
     */
    removeListener: function (eventName, callback) {
        if (this.eventList[eventName]) {
            var ev = this.eventList[eventName];
            if (ev.callbacks && ev.callbacks.length) {
                for (var i = 0, count = ev.callbacks.length; i < count; i++) {
                    if (callback) {
                        if (callback === ev.callbacks[i]) {
                            ev.callbacks[i] = null;
                            break;
                        }

                    }
                    else {
                        ev.callbacks[i] = null;
                        continue;
                    }

                }
            }
        }
    },
    /**
     * 为事件取消绑定事件处理函数
     * @param {string} eventName 事件名     
     * @param {Function} callback 事件处理函数
     */
    unbind: function (eventName, callback) {
        if (!eventName && !callback) { //移除所有的事件处理函数
            var key;
            for (key in this.eventList) {
                if (key && this.eventList[key] && this.eventList.hasOwnProperty(key)) {
                    this.removeListener(key);
                }
            }
        }
        else {
            this.removeListener(eventName, callback);
        }
    },
    /**
     * 事件触发.
     * @param {string} eventName 事件名     
     * @param {Object} data 事件数据, 会传递给事件处理函数
     */
    emit: function (eventName, data) {
        //处理event
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

        //处理group, 找到绑定了event的所有group, 并触发groupEmit
        var groups = this.eventGroupIndexer[eventName] || [];
        for (var i = 0, count = groups.length, groupName; i < count; i++) {
            groupName = groups[i];
            if (groupName) {
                this.groupEmit(groupName);
            }
        }
    },
    /**
     * 创建事件组
     * @param {string} groupName 事件组名,需要在当前event对象中唯一
     * @param {Array} eventNames 需要绑定的事件名集合     
     * @param {Function} callback 事件组中的事件全部完成时, 执行的事件处理函数
     */
    group: function (groupName, eventNames, callback) {
        this.groupList[groupName] = this.groupList[groupName] || {};
        var group = this.groupList[groupName];
        var events = group.events = group.events || {};

        //添加group的callback
        if (callback) {
            (group.callbacks = group.callbacks || []).push(callback);
        }

        //记录event与group的关系    
        var eventName, eventNames = eventNames || [];
        for (var i = 0, count = eventNames.length; i < count; i++) {
            eventName = eventNames[i];
            events[eventName] = 1;
            (this.eventGroupIndexer[eventName] = this.eventGroupIndexer[eventName] || []).push(groupName);
        }
    },
    /**
     * 事件组触发函数
     * @param {string} groupName 事件组名
     */
    groupEmit: function (groupName) {
        var group = this.groupList[groupName];
        //安全性监测
        if (!group) return;

        //检索group中的所有event是否执行完毕
        var events = group.events = group.events || {};
        var groupFinished = true;
        var callbackData = {};
        var eventName, ev;
        for (eventName in events) {
            if (eventName && events.hasOwnProperty(eventName)) {
                ev = this.eventList[eventName];
                if (!ev || !ev.status) { //未完成
                    groupFinished = false;
                    callbackData = null;
                    break;
                }
                else {
                    callbackData[eventName] = ev.data;
                }
            }
        }
        eventName = null;

        //执行group的回调函数
        if (groupFinished) {
            //处理callback回调函数数组
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

            //处理after回调函数数组
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
    /**
     * 添加事件组执行完毕后的回调函数. 
     * @param {string} groupName 事件组名
     * @param {Function} callback 回调函数.此回调函数会在事件组绑定的所有事件都执行完毕后执行.
     */
    afterGroup: function (groupName, callback) {
        var group = this.groupList[groupName] = this.groupList[groupName] || {};
        var afters = group.afters = group.afters || [];
        afters.push(callback);
    }
});