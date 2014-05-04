#oojs-make codes easy

因为js的灵活性, 在开发中经常会出现孤零的变量, 比如:
```js
var a = function(){return b};
var b = 'hello';
var c = a();
```
	
这是导致js开发变得更像"面向过程开发". 比如找几个AMD(或者CMD)模块, 看看他们的factory函数, 基本上都是典型的面向过程开发---代码可读性差, 过程复杂不易维护. 

AMD等规范让模块接口变得干净漂亮, 但是模块的内部实现却没有控制内部实现.这是导致很多模块拥有"漂亮的外表, 丑陋的内心".

oojs框架可以解决这些问题, 用一种最简单的, 最人性化的方式, 让js代码变的更易阅读和维护. 

首先看看我们最习惯的使用json来组织对象的方式:
```js
var myObj = {
	a: function(){
		return this
	},
	b: 'hello'
}

var c = myObj.a();
```	
使用json来组织代码结构是最自然的方式. oojs提供了一种用json组织项目全部代码和变量的方式. 

(PS:oojs中的oo(Object Oriented)即面向对象, 我们认为: 对象是组织代码的最小单位.)

---

##官方首页
http://www.develop.cc

## oojs主要功能
* 使用json结构描述类.
* 兼容nodejs和browser两种环境.
* 使用命名空间组织代码

###名词解释
* 全限定性名:命名空间+类名.比如类C, 所在的命名空间是A.B, 则C的全限定性名是A.B.C

---

##oojs快速入门

* Step 1.引入oojs文件

nodejs:    
```js
require('./src/oojs.js');
```

browser:
```html
<script type="text/javascript" src="./src/oojs.js"></script>
```
    
  src文件夹是js代码的根目录.里面使用命名空间组织代码. 需要将oojs.js放到根目录下, oojs.js会计算所在目录位置并记录在base.basePath中. oojs.js引入后, 会创建全局变量"oojs"和全局函数"define". 
  
  注意, oojs.js本身也是使用oojs框架创建和解析的, 十分便于阅读和修改. 

* Step 2.创建/使用类

    这里我们一个类string, 提供一个template方法用于模板和数据的拼接:
    ```js
	define && define({
		name: 'string',
		namespace: 'base.utility',
		template: function (source, data) {
			var regexp = /{(.*?)}/g;
			return source.replace(regexp, function (match, subMatch, index, s) {
				return data[subMatch] || "";
			});
		}
	});
	```
	
	再定义一个page类, 这个类可以直接写在页面里作为页面的运行入口, 不需要提供namespace, 但是需要提供一个静态构造函数作为运行入口:
    ```js
		define && define({
			name: 'page',
			deps: {
				string: 'base.utility.string'
			},
			$page:function(){
				this.string.template('My name is {name}', {name:'ZiQiu'});
			}
		})
    ```
    define函数是oojs.js引入时创建的全局函数. 调用define时要传入一个用json描述的对象.

    此对象的以下属性是oojs系统使用的:    
    
    * name: 类名, 比如上面的 string
    * namespace: 类所在的命名空间. 比如string类我们将其放在了base.utility这个存放工具类的命名空间下.
    * 名字为 类名 的函数(比如string类的string属性): 类的构造函数. 使用base.create创建一个类实例时, 会执行的函数.
    * 名字为 "$"+类名 的函数(比如string类的$string属性): 类的静态构造函数. 当一个类引入到系统的时候, 会执行一次. 创建实例的时候不会执行.  
    * deps: 依赖的类. 使用object描述. key为引用名, value为类的全限定性名. 后续可以通过this.key引用到这个类.
	
	page类因为提供了deps属性和$page静态构造函数, 所以运行流程是首先加载page类中deps属性描述的所有依赖类. 
	
	加载完毕后, 会调用$page函数. 在$page函数中可以通过 this.string 获取到string类的引用.
	
	这里使用了oojs提供的加载器,配合deps属性来加载其他依赖的类.  还可以使用oojs.using函数来获取类引用, 举例如下:	

	string类当成一个静态类的使用代码如下:
	```js
        //获取到类的引用
        var string = oojs.using('base.utility.string');
        //直接使用类的静态函数
        string.template('My name is {name}', {name:'ZiQiu'});
	```
	
	同样, 也可以创建一个 string类的实例:
	```js
        //在string类中下面的用法是没有意义的, 只是演示一下如何创建类实例.
        var string = oojs.using('base.utility.string');
        var myString = oojs.create(string);
        myString.template('My name is {name}', {name:'ZiQiu'});
	```	

---
		
##JS项目代码结构
oojs使用命名空间来组织代码. 首先, 我们建立 src 文件夹, 作为放置所有js代码的目录.

oojs.js文件需要放置在src的根目录下. 
每个命名空间都是一个文件夹. 比如 base.utility.string 类的目录结构就是:

    src/base/utility/string.js

所以一个项目的js源码应该是下面的样子:   

    * src
        * oojs.js
        * base
            * utility
                * string.js
                * cookie.js
            * buseiness
            * ui

在oojs加载类的时候, 会根据 oojs.basePath 根路径配合上面的相对路径来查找类文件.

在nodejs环境中, basePath为oojs.js的所在目录. 即不需要进行basePath的路径配置, 只需要把oojs.js放在src的根目录下即可.

在浏览器环境中, 需要通过oojs.config类设置根路径的url地址.比如:

    oojs.config({basePath: 'http://www.mycdn.com/static/src/'})

则记载string.js类是, 会通过下面的路径查找:
    
    http://www.mycdn.com/static/src/base/utility/string.js

---
     
## oojs的git源码结构
oojs.js文件是通过oojs项目编译出来的. 下面介绍oojs的项目结构. 并欢迎更多的开发者参与到oojs的开发和推广中来.

* bin目录: 用于存放编译后的文件.
    * oojs.compress.js : 源码压缩后的js文件.
    * oojs.compress.js.gz: 上面js文件的gzip文件.
    * oojs.format.js: 源码去掉注释的js文件.主要用于开发调试.因为源码中含有中文注释, 这些注释会影响js文件的编码并在部分web页面上产生兼容问题. 所以推荐使用此文件调试.
    * oojs.source.js: 源码文件, 包含所有注释信息.
 
* src目录: 存放oojs的源码文件
    * core.js : oojs核心, 提供使用JSON的面向对象编程方式
    * event.js: 事件模块, 通过oojs.event引用. 提供事件机制. 
    * loader.js: 加载器, 依赖event.js, 提供浏览器和node环境下的依赖加载.

* .gitignore: git配置文件, 里面写明了git不需要管理的文件. 比如 node_modules 文件夹.

* README.md: 说明文档. 即您正在阅读的这个页面的内容.

* make.js: 编译文件. 使用 node make.js 命令, 可以从src目录生成bin目录下面的所有文件.

* package.json: 包描述文件.

[小结]:
通常的开发方式是在src中修改源码, 然后执行:

    node make.js

make.js执行后, 会生成bin下面的各个编译后的文件.
make.js需要使用uglify-js模块进行js的压缩处理.执行make.js的时候会自动判断是否安装了uglify-js模块, 如果没有安装则会自动执行:

    npm install uglify-js

如果中国用户使用npm遇到网络问题, 推荐使用cnpm替代npm:

    npm install cnpm
    cnpm install uglify-js

上面命令可以在执行make.js前手动执行. make.js运行时发现已经安装过uglify-js则不会再进行安装.

---
    
## 事件函数与this指针
假设我们声明了一个类:
```js
    define && define({
        name:'myClass',
        word: 'Hello World',
        say: function(){
            alert(this.word);
        }
    })
```
myClss类有一个say函数, 回输出myClass类的word属性. say函数中通过this引用myClass类自身. 这在通常情况下都是正确的.

但是在事件中, 比如常见的按钮单击事件, 或者一个定时器函数, this指针并不是总指向myClass自身的:
```js
    var myClass = oojs.using('myClass');
    setTimeout(myClass.say, 1000);
```
 上面的代码不会输出任何信息. 因为在setTimeout中的this指向了window对象而不是myClass. 所以oojs修改了function的圆形, 为每一个function对象提供了一个proxy函数.

proxy函数用来修改事件的this指针. 比如上面的代码可以这样修改:
```js
    var myClass = oojs.using('myClass');
    setTimeout(myClass.say.proxy(myClass), 1000);
```
使用了proxy之后, 就可以正常的输出Hello World了.

proxy函数的第一个参数就是this指针需要指向的对象. 

proxy函数还可以修改事件处理函数的签名, 下面举一个复杂的例子.

在nodejs中, 系统提供了socket对象, 用于网络编程. 
```js
var net = require('net');
var client = net.connect({port: 8124},
    function() { //'connect' listener
          console.log('client connected');
          client.write('world!\r\n');
});
```
其中的client变量就是socket对象. 这里使用了一个匿名函数, 执行client.write来向客户端发送数据. client是通过闭包调用的. 

因为这个匿名的function函数是由系统调用的, 即nodejs收到connection的请求的时候, 回调用函数. 函数内再使用闭包获取到client. 

使用下面的方式, 可以避免使用闭包, 让client通过函数参数传递过去:

```js
var net = require('net');
var client = net.connect({port: 8124},
    function(socket) { //'connect' listener
          console.log('client connected');
          socket.write('world!\r\n');
}.proxy(this, client));
```
注意, 这里通过proxy除了传递this对象外, 还传递了一个socket对象. 虽然系统调用匿名function的时候, 不会传递socket对象, 但是通过proxy的方式却可以在匿名function中获取到参数中的socket. 

实现原理是依旧是通过闭包, proxy函数本身就是形成一个闭包. 但是proxy函数的设计将闭包做成了参数形式传递, 十分便于代码的阅读和维护.

相对于传统的node变成, 下面来看看使用oojs实现的完整的socket服务器的例子:
```js
require('./src/oojs.js');


define && define({
    name: 'socketServer',    
    /**
     * 静态构造函数
     */
    $socketServer: function () {
        var net = require('net');
		
        //启动服务
        this.server = net.createServer();
        this.server.on('connection', this.onConnection.proxy(this));
        this.server.on('error', this.onError.proxy(this));
        this.server.listen(8088, function () {
            base.log.info('server bound');
        });
    },

    /**
     * 服务器连接事件处理函数. 
     * @param {Object} socket 本次连接的socket对象
     */
    onConnection: function (socket) {
        socket.on('data', this.onData.proxy(this, socket));
        socket.on('end', this.onEnd.proxy(this, socket));
        socket.on('error', this.onError.proxy(this, socket));
    },

     /**
     * socket接收数据事件处理函数. 
     * @param {Object} data 本次介绍到的数据对象buffer
     * @param {Object} socket 本次连接的socket对象
     */
    onData: function (data, socket) {
        //do something...
    },

    /**
     * socket 关闭事件处理函数. 
     * @param {Object} socket 本次连接的socket对象
     */
    onEnd: function (socket) {
        //do something...
    },

    /**
     * socket 异常事件处理函数. 
     * @param {Object} err 异常对象
     * @param {Object} socket 本次连接的socket对象
     */
    onError: function (err, socket) {
        //do something...
    }
});
```


---

##oojs的原型继承和快速克隆
oojs中使用特有的快速克隆方法实现高效的对象创建. 主要用在内部的oojs.create函数中, 此函数用于创建一个类实例.

假设a是classA的一个实例. 此时的原型链情况如下:

    a.contructor.prototype->classA

当访问a的一个属性时, 有以下几种情况:

1. 属性是值类型:
    访问: 通过原型链获取到classA的属性
    赋值: 在a对象上设置新的属性值, 再次访问时获取到的是a对象上的新值
2. 属性是引用类型(比如object类型):
    访问: 通过原型链获取到classA的属性
    赋值: 因为是引用类型, 所以实际上是对classA上的引用对象赋值. 即classA被修改, 所有实例的此属性都被修改

为了解决此问题, oojs在创建classA的实例时, 会遍历classA的属性, 如果发现属性的类型是引用类型, 则对其进行快速克隆:
```js
        /**
         * 快速克隆方法
         * @public
         * @method fastClone
         * @param {Object} source 带克隆的对象. 使用此方法克隆出来的对象, 如果source对象被修改, 则所有克隆对象也会被修改
         * @return {Object} 克隆出来的对象.
         */
        fastClone: function (source) {
            var temp = function () {};
            temp.prototype = source;
            var result = new temp();
        }
```
传统的克隆对象是十分消耗性能的, oojs的最初也是用了传统的克隆方法. 最后改进成使用快速克隆方法. 

假设这个属性为A, 此时相当于将属性A作为类, 创建了一个属性A的实例, 即关系是:

    a.A.constructor.prototype -> classA.A 

此时, 如果A的所有属性都不是引用类型, 则可以解决上面的赋值问题.
但是如果属性A本身, 又含有引用类型, 则同样会出现赋值是修改原形的问题. 
假设: A.B为object
则通过 a.A.B 获取到的对象与 classA.A.B 获取到的对象是同一个对象. 对于a.A.B的修改同样会影响到classA.A.B
通过递归的快速克隆可以解决此问题, 但是因为性能开销太大, 所以oojs最后不支持多层的对象嵌套. 

实际上, 我们可以通过编程方式来解决这个问题.
* 在类声明时赋值的属性, 即JSON中直接描述的属性值, 应该是静态static类型. 不应在运行时修改.
* 如果一个属性是实例属性, 则应该在动态构造函数中赋值.比如:
```js
define && define({
    name: 'classA'
    A: null
    classA:function(){
        this.A = { B:1 }
    }
});
```

所以一定要注意, 如果类的属性是对象, 并且是实例属性(运行时会被修改),则必须在动态构造函数中创建.

另改一个问题就是a对象的遍历. 同样因为使用了原型继承, 不能够通过hasOwnProperty来判断一个属性是否是实例a的. 可以通过遍历classA来解决:
```js
for(var key in a){
    if(key && typeof a[key] !== 'undefined' && classA.hasOwnProperty(key)){
        //do something...
    }
}
```

---

##事件编程
js中常常使用事件和异步, 在浏览器端的Ajax是异步, 在nodejs中更是到处都是异步事件.

在异步事件的编程中, 常常会遇到多层嵌套的情况. 比如:

```js
var render = function (template, data, l10n) {
  //do something...
};

$.get("template", function (template) {
  // something
  $.get("data", function (data) {
    // something
    $.get("l10n", function (l10n) {
      // something
      render(template, data, l10n);
    });
  });
});
```
在异步的世界里, 需要在回调函数中获取调用结果, 然后再进行接下来的处理流程, 所以导致了回调函数的多层嵌套, 并且只能串行处理.

oojs提供了oojs.event, 来解决此问题. 比如要实现上面的功能, 可以进行如下改造:
```js
var render = function (template, data, l10n) {
  //do something...
};

var ev = oojs.create(oojs.event);
ev.bind('l10n', function(data){
    ev.emit('l10n', data);
});
ev.bind('data', function(data){
    ev.emit('data', data);
});
ev.bind('template', function(data){
    ev.emit('template', data);
});
//并行执行template, data和l10n事件, 都执行完毕后会触发group中的回调函数
ev.group('myGroup', ['template','data','l10n'], function(data){
    render(data.template, data.data, data.l10n);
});
```
oojs.event的group可以将事件打包成一组. 在group的回调函数中, 会传递一个参数data, 这是一个object对象, 其中key为group中绑定的每一个事件名, value为事件的返回值. 所以可以通过data[事件名]获取到某一个事件的返回值. 

oojs.event中的group还可以动态添加新的事件. 比如:
```js
ev.group('myGroup', ['template','data','l10n'], function(data){
    render(data.template, data.data, data.l10n);
});

ev.group('myGroup', ['another'], function(data){
    anotherData = data.another;
});
```
注意上面的代码, 虽然为myGroup又添加了一个another事件. 但是此时mygroup绑定了两个事件处理函数, 这两个函数都会在所有事件完成时执行, 但是不一定哪个在前. 所以oojs.event还提供了afterGroup事件, 此事件会在所有group绑定的callback执行完毕后再执行:
```js
ev.group('myGroup', ['template','data','l10n']);

ev.group('myGroup', ['another']);

ev.afterGroup('myGroup', function(data){
    render(data.template, data.data, data.l10n, data.another);
});
```

oojs.event使用oo的思想实现. node中本身自带EventEmmiter也实现了部分功能. 

---

## 为什么要用面向对象的思想写js?

oo不仅仅是一种编程方法, 而是组织代码的最小单位. 

看几个使用AMD规范的例子就会明白, AMD中最后一个参数factory虽然美其名曰构造函数, 但是在这个函数中, 你可以做任何事情:创建局部function, function中再嵌套function, 使用闭包, 处理一些业务逻辑. 最后的结果是这个factory不易阅读和维护.
    
究其原因, js编程很容易陷入面向过程编程的方式中. 而AMD等规范只注重"模块"的开发, 却忽视了一个模块内部的代码如何组织和管理.
    
js中让代码不易管理的几个杀手包括: 闭包, 零散的函数对象, 异步机制(node中尤其重要).
    
oojs使用oo的思想, 减少闭包的使用, 让每一个函数对象都挂靠在类对象上, 减少孤零的函数对象的存在. 再配合oojs.event的事件机制, 解决异步编程中的事件嵌套噩梦.
    
可以说oojs为js的大规模开发提供了有效地基础保障.

---

##To Do
* 如何处理public和private
* dispose模式
* 标准化的单元测试和性能测试
* 网站建设


## 加入我们
   oojs还在发展中, 我们尽量不在核心的oojs.js中加入过多的功能, 保持核心精简. 同时通过oojs团队成员的努力, 让oojs适用于更多的场景. 
   
   欢迎有志之士加入到oojs的开发中来! 
   
   oojs项目现有团队成员列表:  
   
   * `zhangziqiu`:zhangziqiu@qq.com
   * `fanwenjuan`:914399187@qq.com
   * `wangbin`:feeyarcat@gmail.com    
   
   
   