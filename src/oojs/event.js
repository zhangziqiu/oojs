oojs.define({

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
    name: 'event',
    namespace: 'oojs',

    /**
     event集合. 记录所有绑定的事件.
     格式为:
     {
         eventName:{
             name: eventName,	//event名
             callbacks: [{
                     callback:function(){},	//回调函数
                     data:null,  	        //回调函数返回的数据
                     needTimes:1,			//希望执行的次数, 默认为 1
                     emitTimes:0			//已经执行了的次数, 默认为 0
                 }],
             emitData:[],		//执行emit时传递的数据
             status:false,		//true表示已经触发过 emit
             groups:{}			//所属groupName索引
         }
     }
     */
    eventList: null,

    /**
     group集合.
     格式为:
     {
        groupName:{
             name: groupName,	//group名
             callbacks: [{
                     callback:function(){},	//回调函数
                     data:null,  	        //回调函数返回的数据
                     needTimes:1,			//希望执行的次数, 默认为 1
                     emitTimes:0				//已经执行了的次数, 默认为 0
                 }],
             emitData:[],		//执行emit时传递的数据
             status:false,		//true表示已经触发过 emit
             events:{},			//group内的eventName数组索引
             previousGroups:{},	//group前节点groupName数组索引
             afterGroups:{}		//group后节点groupName数组索引
         }
     }
     */
    groupList: null,

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
     * 创建一个 Callback
     * {
            callback:function(){},	//回调函数
            data:null,  	        //回调函数返回的数据
            needTimes:1,			//希望执行的次数, 默认为-1表示循环执行
            emitTimes:0				//已经执行了的次数, 默认为 0
        }
     */
    createCallback: function (callback, needTimes, emitTimes) {
        callback = typeof callback !== 'undefined' ? callback : function () {
        };
        needTimes = typeof needTimes !== 'undefined' ? needTimes : -1;
        emitTimes = typeof emitTimes !== 'undefined' ? emitTimes : 0;

        return {
            callback: callback,
            data: null,
            needTimes: needTimes,
            emitTimes: emitTimes

        };
    },

    /**
     * 创建一个event对象.
     */
    createEvent: function (eventName) {
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

    /**
     * 创建一个group对象.
     */
    createGroup: function (groupName) {
        var result = {
            name: groupName,
            callbacks: [],
            callbackData: [],
            emitData: [],
            status: false,
            events: {},
            previousGroups: {},
            afterGroups: {}

        };
        return result;
    },

    /**
     * 为事件添加事件处理函数
     * @param {string} eventName 事件名
     * @param {Function} callback 事件处理函数
     * @param {number} times 可以不传递, 事件处理函数执行几次, 默认为1次, 循环执行传递-1
     */
    bind: function (eventName, callback, times) {
        // 如果event对象不存在,则创建新的event对象
        var ev = this.eventList[eventName] = this.eventList[eventName] || this.createEvent(eventName);
        ev.callbacks.push(this.createCallback(callback, times));

        // 如果事件已经触发过, 则立刻执行
        if (ev.status && ev.emitData.length) {
            for (var i = 0, count = ev.emitData.length; i < count; i++) {
                this.emit(ev.name, ev.emitData[i]);
            }
            // 执行完毕后清空eventData, 避免重复调用.
            ev.emitData = [];
        }
        return this;
    },

    /**
     * 为事件取消绑定事件处理函数.
     * 一个参数: 只传递一个参数 eventName 则删除此eventName的所有callback
     * 两个参数: 同时传递eventName和callback 则删除此eventName的指定callback
     * 无参数:   表示移除所有事件的所有callback
     * @param {string} eventName 事件名
     * @param {Function} callback 事件处理函数
     */
    unbind: function (eventName, callback) {
        if (!eventName && !callback){
            // 移除所有事件处理函数
            for (var key in this.eventList) {
                if (key && this.eventList[key] && this.eventList.hasOwnProperty(key)) {
                    this.unbind(key);
                }
            }
        }
        else{
            var eventItem = this.eventList[eventName];
            if (eventItem && eventItem.callbacks && eventItem.callbacks.length) {
                for (var i = 0, count = eventItem.callbacks.length; i < count; i++) {
                    if (callback) {
                        // 移除某一个事件的某一个事件处理函数
                        if (eventItem.callbacks[i].callback === callback) {
                            eventItem.callbacks[i].callback = null;
                            eventItem.callbacks[i].needTimes = 0;
                        }
                    }
                    else{
                        // 移除某一个事件的所有事件处理函数
                        eventItem.callbacks[i].callback = null;
                        eventItem.callbacks[i].needTimes = 0;
                    }
                }
            }
        }

    },

    /**
     * 事件触发.
     * @param {string} eventName 事件名
     * @param {Object} data 事件数据, 会传递给事件处理函数
     */
    emit: function (eventName, data) {
        var ev = this.eventList[eventName] = this.eventList[eventName] || this.createEvent(eventName);
        ev.status = true;

        if (!ev.callbacks || !ev.callbacks.length) {
            // 只有一种情况需要缓存emitData: event未绑定任何事件处理函数
            ev.emitData.push(data);
        }
        else {
            // 执行event的所有callback
            if (ev.callbacks && ev.callbacks.length) {
                for (var i = 0, count = ev.callbacks.length; i < count; i++) {
                    var callbackItem = ev.callbacks[i];
                    var callbackFunction = callbackItem.callback;

                    var needRun = false;
                    if (callbackItem.needTimes === -1) {
                        // 设置-1表示循环执行
                        needRun = true;
                    }
                    else {
                        if (callbackItem.needTimes > 0 && callbackItem.emitTimes < callbackItem.needTimes) {
                            // 未达到设置的最大执行次数
                            needRun = true;
                        }
                    }

                    callbackItem.emitTimes++;
                    if (needRun && callbackFunction) {
                        callbackItem.data = callbackFunction(data);
                    }
                }
            }
        }

        // 处理group
        for (var groupName in ev.groups) {
            if (groupName && ev.groups.hasOwnProperty(groupName) && ev.groups[groupName]) {
                this.groupEmit(groupName);
            }
        }
        return this;
    },

    /**
     * 创建事件组
     * @param {string} groupName 事件组名,需要在当前event对象中唯一
     * @param {string|Array} eventNames 需要绑定的事件名或事件名集合
     * @param {Function} callback 事件组中的事件全部完成时, 执行的事件处理函数
     * @param {number} times 可以不传递, 事件处理函数执行几次, 默认为1次, 循环执行传递-1
     */
    group: function (groupName, eventNames, callback, times) {
        var group = this.groupList[groupName] = this.groupList[groupName] || this.createGroup(groupName);

        // 添加group的callback
        if (callback) {
            callback = callback instanceof Array ? callback : [
                callback
            ];
            for (var i = 0, count = callback.length; i < count; i++) {
                group.callbacks.push(this.createCallback(callback[i], times));
            }
        }

        // eventNames可以是string或Array
        var eventName;
        eventNames = typeof eventNames === 'string' ? [
            eventNames
        ] : eventNames;
        for (var i = 0, count = eventNames.length; i < count; i++) {
            eventName = eventNames[i];
            // 如果event不在此分组中, 则添加到分组
            if (!group.events[eventName]) {
                group.status = false; // 新添加了事件, 设置group的状态为false
                // 如果事件不存在则创建
                var ev = this.eventList[eventName] = this.eventList[eventName] || this.createEvent(eventName);
                ev.groups[groupName] = 1;
                group.events[eventName] = 1;
            }
        }

        // 触发一次 groupEmit, 如果新绑定的event已经是执行完毕的, 则group会立刻触发
        if (eventNames.length > 0) {
            this.groupEmit(groupName);
        }
        return this;
    },

    /**
     * 事件组触发函数
     * @param {string} groupName 事件组名
     */
    groupEmit: function (groupName) {
        var group = this.groupList[groupName] = this.groupList[groupName] || this.createGroup(groupName);

        // 首先检查 afterGroups, 如果afterGroups没有准备完毕, 则立刻停止emit
        var afterGroups = group.afterGroups;
        var afterGroupFinished = true;
        for (var afterGroupName in afterGroups) {
            if (afterGroupName && afterGroups.hasOwnProperty(afterGroupName)) {
                if (this.groupList[afterGroupName]) {
                    // 存在group, 检查group是否已完成
                    if (!this.groupList[afterGroupName].status) {
                        afterGroupFinished = false;
                    }
                }
            }
        }

        // 如果 afterGroups 存在未完成的group, 则立刻停止运行.
        if (!afterGroupFinished) {
            return this;
        }

        // 检索group中的所有event是否执行完毕
        var events = group.events;
        var eventFinished = true;
        var ev;
        for (var eventName in events) {
            if (eventName && events.hasOwnProperty(eventName) && events[eventName]) {
                ev = this.eventList[eventName] = this.eventList[eventName] || this.createEvent(eventName);
                if (!ev.status) {
                    // 事件未完成
                    eventFinished = false;
                    break;
                }
            }
        }

        // 所有的event已经完成
        if (eventFinished) {
            // 设置group已完成
            group.status = true;

            // 获取event callback的返回数据
            var eventCallbackData = {};
            for (var eventName in events) {
                if (eventName && events.hasOwnProperty(eventName) && events[eventName]) {
                    var callbacks = this.eventList[eventName].callbacks;
                    eventCallbackData[eventName] = [];
                    for (var i = 0, count = callbacks.length; i < count; i++) {
                        eventCallbackData[eventName].push(callbacks[i].data);
                    }
                    // 如果数组中只有一个元素, 则不传递数组直接传递元素.
                    if (eventCallbackData[eventName].length === 1) {
                        eventCallbackData[eventName] = eventCallbackData[eventName][0];
                    }
                }
            }

            // 执行group的回调函数
            if (group.callbacks && group.callbacks.length) {
                for (var i = 0, count = group.callbacks.length; i < count; i++) {
                    var callbackItem = group.callbacks[i];
                    var callbackFunction = callbackItem.callback;
                    var needRun = false;
                    if (callbackItem.needTimes === -1) {
                        // 设置-1表示循环执行
                        needRun = true;
                    }
                    else {
                        if (callbackItem.needTimes > 0 && callbackItem.emitTimes < callbackItem.needTimes) {
                            // 未达到设置的最大执行次数
                            needRun = true;
                        }
                    }
                    callbackItem.emitTimes++;
                    if (needRun && callbackFunction) {
                        callbackItem.data = callbackFunction(eventCallbackData);
                    }
                }
            }

            // 执行previousGroups的emit
            var previousGroups = group.previousGroups;
            for (var previousGroupName in previousGroups) {
                if (previousGroupName && previousGroups.hasOwnProperty(previousGroupName)) {
                    this.groupEmit(previousGroupName);
                }
            }
        }

        return this;
    },

    /**
     * 构造事件组队列.     *
     * ev.queue(['groupA, groupB'], ['groupC'], ['groupD', 'groupE']);
     *ev.queue('groupA', ['groupB','groupC'], 'groupD');
     */
    queue: function (previousGroupName, nextGroupName) {
        var args = Array.prototype.slice.apply(arguments);
        var previousGroups;
        var nextGroups;
        for (var i = 1, count = args.length; i < count; i++) {
            previousGroups = args[i - 1];
            nextGroups = args[i];

            // 都处理成数组统一处理
            previousGroups = previousGroups instanceof Array ? previousGroups : [
                previousGroups
            ];
            nextGroups = nextGroups instanceof Array ? nextGroups : [
                nextGroups
            ];

            // 添加关联关系
            for (var j = 0, jcount = previousGroups.length; j < jcount; j++) {
                var previousGroupName = previousGroups[j];
                this.groupList[previousGroupName] = this.groupList[previousGroupName] || this.createGroup(previousGroupName);
                var previousGroup = this.groupList[previousGroupName];
                for (var k = 0, kcount = nextGroups.length; k < kcount; k++) {
                    var nextGroupName = nextGroups[k];
                    this.groupList[nextGroupName] = this.groupList[nextGroupName] || this.createGroup(nextGroupName);
                    var nextGroup = this.groupList[nextGroupName];
                    // 添加关联
                    previousGroup.afterGroups[nextGroupName] = 1;
                    nextGroup.previousGroups[previousGroupName] = 1;
                }
            }
        }
    }
});
