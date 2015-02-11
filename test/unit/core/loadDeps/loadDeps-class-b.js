define && define({
    name: 'b',
    namespace: 'oojs.core.test',
    deps: {
        c: 'oojs.core.test.c'
    },
    $b: function() {
        console.log("class-b-loaded");
        console.log("b.c:");
        console.log(this.c);
    }
});