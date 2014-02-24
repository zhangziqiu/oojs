#OOJS
oojs是nova原创的, 适用于第三方js嵌入(比如app应用, 开放平台等)的, 使用面向对象编程方式的javascript编程框架.
oojs是编程框架而非类库.   

##官方首页
https://github.com/Arthur-Q/oojs    

## OOJS主要功能
* 提供了命名空间,类,类实例的概念.全部使用json格式标识.
* 提供了类似高级语言(java, c#)的编程方式. 比如使用this指针, 很方便的引用命名类范围内的变量, 忽略全局变量等.
* 处理iframe, 让开发人员在大多数情况下忽略iframe的影响.
* 体积小巧, 源代码带注释只有不到300行代码, 压缩后更小.
 
##OOJS快速入门
   
* Step 1.使用JSON声明类或命名空间
        var MyClass = {
            fullName  : "MyNamespace.MyClass",
            version     : "1.0.0",
            register    : function() {
                        this.G = this.win[___baseNamespaceName];
                        this.U = this.win[___baseNamespaceName]["Utility"];            
            },   
            
            propertyA: "A",
            methodA :  function(){ alert(this.propertyA); }
        }

* Step 2.使用基础命名空间的registerClass或registerNamespace注册类或命名空间

        G.registerClass(MyClass );

* Step 3.创建和使用类实例

        var myObj = G.create(MyNamespace.MyClass);
        myObj.methodA(); //output:A

上面步骤中的变量"G", 是挂在window上面的全局变量, 也就是基础命名空间:

        (function(G){})
            
        (window[___baseNamespaceName])

此框架只会在window上面, 创建两个变量:
* window.___baseNamespaceName:用于保存变量G的名字
* window[___baseNamespaceName]:使用一个object作为框架的基础命名空间, 此对象提供框架的基础方法. 

##oojs的原理解析

###支持JSON格式的命名空间/类声明
拆分类的声明和注册. 声明的时候, 使用JSON格式. 注册的时候, 会解析类声明对象. 
创建类实例的时候, 不使用new, 而是使用G.create()方法.

###支持iframe调用
在类注册时, 注册函数会查看当前是否保存在跨域iframe中, 如果非跨域iframe调用, 则会同时在top和当前页window上注册类.
然后, 使用G提供的using函数, 可以获取到对某一个命名空间的引用, 比如:

    var BL = G.using("$baseName.BusinessLogic"); 

则这个BL是指向top页面的命名空间的引用. 如果一个页面上有三个非跨域iframe, 每个iframe中的js都可以使用:

    BL.counter++;

这样的方式来计数. 让BL使用起来完全忽略了iframe的问题.

###iframe销毁导致的js无法使用问题
如果top页面上的一个方法, 使用过iframe页面里面的js注册的.则当此iframe销毁时, 如果再调用top页面上的此方法, 会报脚本错误.
最显著的例子, 比如frameset框架页的刷新.

目前oojs的解决办法是:
当注册一个类时, 拆分类的方法和属性.
* 将类方法重新在top页面上注册
* 属性不变(放置全局变量被重置)

目前能够解决框架页刷新的问题, 或者iframe被移动等问题(即原iframe被销毁但是会有新的同js被引入).

未来计划修改成:
在iframe销毁时, 在父页面自动加载js, 保证方法引用不会出现问题.

###按需加载(未实现)
使用seaJS等脚本, 可以实现JS的按需加载, 也就是可以实现以类为单位的加载.
目前, 使用一个类要么被全部加载, 要么不加载.

* 根据函数调用, 在编译阶段确定是否会刻调用类的某一个函数, 将不用的函数删除.
* 编译期间确定会调用的函数, 再根据加载时间, 分阶段加载. 比如分为下面几个阶段: WindowOnloading, DomReady, WindowOnloaded. 
  虽然拆分后会导致http请求数变多, 但是因为是在页面加载后请求的, 实际上会提高页面加载速度. 
  另外除了按照时间段加载, 还会提供显示编程加载的模式. 比如使用某个函数前, 可以require()相应的类.
  