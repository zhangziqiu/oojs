define && define({
    name: 'a',
    namespace: 'oojs.core.test',
    deps: {
        b: 'oojs.core.test.b'
    },
    $a: function() {
        console.log("b:");
        console.log(this.b);
        console.log("b.c:");
        console.log(this.b.c);
    }
});