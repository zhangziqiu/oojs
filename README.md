#oojs-make codes easy
oojs是一种编程方法, 使用oojs的轻量级的面向对象编程方法, 会让js代码更易阅读和维护. 

oojs解决的不仅仅是模块包装或模块异步加载的问题, 而是让oo的思想作用在每一处代码逻辑, 通过减少函数嵌套和闭包引用, 来提高代码的可读性. 

oojs是一套编程方法而不是类库, 任何人可以方便的将第三方库和oojs编程方式搭配使用.


##官方首页
http://www.develop.cc (网站备案中, 暂未开通)

## oojs主要功能
* 使用json结构描述类.
* 兼容nodejs和browser两种环境.
* 使用命名空间组织代码
 
##oojs快速入门
   
* Step 1.引入base.js文件

    nodejs:
    
        require('./src/base.js');
        
    browser:
    
        <script type="text/javascript" src="./src/base.js"></script>
    
  src文件夹是js代码的根目录.里面使用命名空间组织代码. 需要将base.js放到根目录下, base.js会计算所在目录位置并记录在base.basePath中. base.js引入后, 会创建全局变量"base"和全局函数"define". 
  
  base.js本身也是使用oojs框架创建和解析的, 十分便于阅读和修改. 

* Step 2.创建一个类

    这里我们一个类string, 提供一个template方法用于模板和数据的拼接.
    
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
    
    define函数是base.js引入时创建的全局函数. 调用define时要传入一个用json描述的对象.

    此对象的以下属性是oojs系统使用的:    
    
    * name: 类名, 比如上面的 string
    * namespace: 类所在的命名空间. 比如string类我们将其放在了base.utility这个存放工具类的命名空间下.
    * 名字为 类名 的函数: 类的构造函数. 使用base.create创建一个类实例时, 会执行的函数.
    * 名字为 "$"+类名 的函数: 类的静态构造函数. 当一个类引入到系统的时候, 会执行一次. 创建实例的时候不会执行.   
    
    这里创建的string类没有构造函数和静态构造函数, 是一个最简单的类, 只有一个template方法.

* Step 3.使用类
    
    类的使用代码如下:

        //获取到类的引用
        var string = base.using('base.utility.string');
        //直接使用类的静态函数
        string.template('My name is {name}', {name:'ZiQiu'});
        //也可以创建一个类实例, create函数第一参数是类引用, 后面可以为构造函数传入其他参数.
        //在string类中下面的用法是没有意义的, 只是演示一下如何创建类实例.
        var myString = base.create(string, {name:'ZiQiu'});
        myString.template('My name is {name}', {name:'ZiQiu'});
    
    define函数会按照命名空间和类名, 将类挂载到全局. 要引用类的使用, 要通过base.using函数, 使用类的全限定性名(即 命名空间+类名)获取到类的引用. 然后就可以使用这个类了.
     
    
## oojs依赖管理(加载器)
虽然我们可以使用requireJS, seaJS等类库与oojs一起使用, 但是为了方便开发者, oojs同样提供了很方便的模块加载功能, 这些都是作为base.js的扩展类提供的. 即如果你不需要这些功能, 或者想自己开发, 完全可以不使用.
    
oojs的加载器使用以下两个文件:

* ./src/base/base.ext.js
* ./src/base/utility/event.js
    
其中event.js是一个事件编程工具类, 类似于node中的EventEmitter, 或者开源的项目EventProxy. 不同之处在event.js是使用oo的方式实现的, 避免了大量的闭包, 而且支持动态的分组管理. 
    
base.ext.js是base类的扩展, oojs支持分布类, 即可以将一个类, 分散到多个文件中. 当系统引入了base.ext.js文件后, base类就获得了加载器的功能.
    
###使用举例    
        <body>
            <div id="log"></div>
            <script type="text/javascript" src="../src/base.js"></script>
            <script type="text/javascript" src="../src/base/utility/event.js"></script>
            <script type="text/javascript" src="../src/base/base.ext.js"></script>
            <script type="text/javascript">
                var page = {
                    name: "page",
                    namespace: "",
                    deps: {
                        param: 'base.business.param'
                    },
                    $page: function () {
                        var param = base.create(this.param, {
                            url: 'a.com'
                        });
                        document.getElementById('log').innerHTML = param.getUrl();
                    }
                }
                define(page);
            </script>
        </body>
    
页面中, 首先引用了必要的js文件. 然后创建了一个page类.

page类的描述中, 使用 deps 属性描述page类的依赖. 其中属性名'param'表示以后可以通过this.param获取到类的引用. 属性值'base.business.param'表示这个类完整路径.
    
入口是define(page), 在define的时候, 会加载page所依赖的param类, 如果param类还有依赖, 也会递归的加载下去, 即直到所有的依赖类全部加载完毕, 才会触发page类的静态构造函数 $page. 
    
    
## 为什么要用面向对象的思想写js?

oo不仅仅是一种编程方法, 而是组织代码的最小单位. 

看几个使用AMD规范的例子就会明白, AMD中最后一个参数factory虽然美其名曰构造函数, 但是在这个函数中, 你可以做任何事情:创建局部function, function中再嵌套function, 使用闭包, 处理一些业务逻辑. 最后的结果是这个factory不易阅读和维护.
    
究其原因, js编程很容易陷入面向过程编程的方式中. 而AMD等规范只注重"模块"的开发, 却忽视了一个模块内部的代码如何组织和管理.
    
js中让代码不易管理的几个杀手包括: 闭包, 零散的函数对象, 异步机制(node中尤其重要).
    
oojs使用oo的思想, 减少闭包的使用, 让每一个函数对象都挂靠在类对象上, 减少孤零的函数对象的存在. 再配合event.js的事件机制, 解决异步编程中的事件嵌套噩梦.
    
可以说oojs为js的大规模开发提供了有效地基础保障.

## 加入我们
   oojs还在发展中, 我们尽量不在核心的base.js中加入过多的功能, 保持核心精简. 同时通过oojs团队成员的努力, 让oojs适用于更多的场景. 
   
   欢迎有志之士加入到oojs的开发中来! 
   
   oojs项目现有团队成员列表:  
   
   * zhangziqiu/zhangziqiu@qq.com
   * fanwenjuan 
   * wangbin    
   
   
   
