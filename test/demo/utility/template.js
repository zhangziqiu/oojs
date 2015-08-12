oojs.define({
    name: 'template',
    namespace: 'utility',
    render: function (source, data) {
        var regexp = /{(.*?)}/g;
        return source.replace(regexp, function (match, subMatch, index, s) {
            return data[subMatch] || '';
        });
    }

});
