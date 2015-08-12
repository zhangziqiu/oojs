oojs.define({
    name: 'classB',
    namespace: 'my',
    deps: {
        classD: 'my.classD'

    },
    $classB: function () {
        console.log('static constructor : ' + this.name);
    }

});
