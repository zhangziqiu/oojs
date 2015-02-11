define && define({
    name: 'c',
    namespace: 'oojs.core.test',
    deps: {},
    $c: function() {
        console.log("class-c-loaded");
        var classB = oojs.using('oojs.core.test.b');
        console.log('b.c:');
        console.log(classB.c);
    }
});