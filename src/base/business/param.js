define && define({
    name : "param",
    namespace: "base.business",
    deps:{ browser:'base.utility.browser'},
    param : function(o){
        this.url = o.url;
    },
    getUrl : function(){
        var url = this.url;
        return url;
    }
});