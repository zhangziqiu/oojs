//oojs的全局设置函数
var $oojs_config = {
    //设置全局作用域
    global: global,
    //为Function原型添加的proxy函数的函数名. false表示不添加. 默认为'proxy'. 可以使用oojs.proxy替代
    proxyName: false,
    //设置代码库根目录. node模式使用文件路径(可以使相对路径), 浏览器模式下需要提供完整的url地址.
    basePath: ''
};