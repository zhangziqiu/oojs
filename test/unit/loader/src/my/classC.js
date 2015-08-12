oojs.define({
    name: 'classC',
    namespace: 'my',
    deps: {
        classD: 'my.classD'

    },
    $classC: function () {
        console.log('static constructor : ' + this.name);
    }

});
