oojs.define({
    name: 'classA',
    namespace: 'my',
    deps: {
        classB: 'my.classB',
        classC: 'my.classC'

    },
    $classA: function () {
        console.log('static constructor : ' + this.name);
    }

});
