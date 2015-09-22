var make = {
    name: 'make',
    sourceFiles: {
        coreFilePath: './src/oojs.js',
        eventFilePath: './src/oojs/event.js',
		promiseFilePath: './src/oojs/promise.js',
        loaderFilePath: './src/oojs/loader.js'

    },
    source: {
        result: '',
        path: './bin/source/oojs.js',
        stream: null

    },
    format: {
        result: '',
        path: './bin/format/oojs.js',
        stream: null

    },
    compress: {
        result: '',
        path: './bin/compress/oojs.js',
        stream: null

    },
    gzip: {
        result: '',
        path: './bin/gzip/oojs.js.gz',
        stream: null

    },
    sourceCore: {
        result: '',
        path: './bin/source/oojs.core.js',
        stream: null

    },
    formatCore: {
        result: '',
        path: './bin/format/oojs.core.js',
        stream: null

    },
    compressCore: {
        result: '',
        path: './bin/compress/oojs.core.js',
        stream: null

    },
    gzipCore: {
        result: '',
        path: './bin/gzip/oojs.core.js.gz',
        stream: null

    },

    compile: function () {
        var result = '';
        var fs = require('fs');
        var path;
        var key;

        for (key in this.sourceFiles) {
            if (key && this.sourceFiles[key] && this.sourceFiles.hasOwnProperty(key)) {
                path = this.sourceFiles[key];
                console.log(path);
                result += fs.readFileSync(path, 'utf8');
                result += '\n';
            }
        }
        return result;
    },

    compileCore: function () {
        var result = '';
        var fs = require('fs');
        var path;
        var key;
        result += fs.readFileSync(this.sourceFiles.coreFilePath, 'utf8');
        return result;
    },

    make: function () {
        // 为Function对象添加proxy函数
        Function.prototype.proxy = function (context) {
            var method = this;
            var args = Array.prototype.slice.apply(arguments);
            var obj = args.shift();
            return function () {
                var tempArgs = Array.prototype.slice.apply(arguments);
                return method.apply(obj, tempArgs.concat(args));
            };
        };

        try {
            var uglify = require('uglify-js');
        }
        catch (ex) {
            this.preinstall(this.build.proxy(this));
        }
        this.build();
        this.buildCore();
    },

    preinstall: function (callback) {
        console.log('can not find "uglify-js", installing......');
        var cp = require('child_process');
        cp.exec('npm install uglify-js', function (err, stdout, stderr) {
            console.log(stdout);
            console.log('uglify-js install finished');
            callback();
        });
    },

    build: function () {
        console.log('building......');

        // 获取合并后的文件字符串
        console.log('compile start......');
        var sourceString = this.compile();
        console.log('compile end......');
        console.log('uglify parse start......');
        var fs = require('fs');
        var uglify = require('uglify-js');
        var ast;
        try {
            ast = uglify.parse(sourceString);
        }
        catch (ex) {
            console.log(ex);
        }

        console.log('uglify parse end......');

        // source
        this.source.stream = uglify.OutputStream({
            beautify: true,
            comments: true,
            width: 120

        });
        ast.print(this.source.stream);
        this.source.result = this.source.stream.toString();
        fs.writeFileSync(this.source.path, this.source.result);
        console.log('compile :' + this.source.path + '" successful!');

        // format
        this.format.stream = uglify.OutputStream({
            beautify: true,
            comments: false,
            width: 120

        });
        ast.print(this.format.stream);
        this.format.result = this.format.stream.toString();
        fs.writeFileSync(this.format.path, this.format.result);
        console.log('compile :' + this.format.path + '" successful!');

        // compress
        this.compress.result = uglify.minify(this.source.result, {
            fromString: true

        }).code;
        fs.writeFileSync(this.compress.path, this.compress.result);
        console.log('compile :' + this.compress.path + '" successful!');

        // gzip
        // 首先将compress的结果写入文件
        fs.writeFileSync(this.gzip.path + '_temp', this.compress.result);
        var zlib = require('zlib');
        var gz = zlib.createGzip({
            level: 9

        });
        var inp = fs.createReadStream(this.gzip.path + '_temp');
        var out = fs.createWriteStream(this.gzip.path);
        inp.pipe(gz).pipe(out);
        console.log('compile :' + this.gzip.path + '" successful!');
        fs.unlinkSync(this.gzip.path + '_temp');

        console.log('build finished');
    },

    buildCore: function () {
        console.log('===core=== building......');

        // 获取合并后的文件字符串
        console.log('===core=== compile start......');
        var sourceString = this.compileCore();
        console.log('===core=== compile end......');
        console.log('===core=== uglify parse start......');
        var fs = require('fs');
        var uglify = require('uglify-js');
        var ast;
        try {
            ast = uglify.parse(sourceString);
        }
        catch (ex) {
            console.log(ex);
        }

        console.log('===core=== uglify parse end......');

        // source
        this.sourceCore.stream = uglify.OutputStream({
            beautify: true,
            comments: true,
            width: 120

        });
        ast.print(this.sourceCore.stream);
        this.sourceCore.result = this.sourceCore.stream.toString();
        fs.writeFileSync(this.sourceCore.path, this.sourceCore.result);
        console.log('===core=== compile :' + this.sourceCore.path + '" successful!');

        // format
        this.formatCore.stream = uglify.OutputStream({
            beautify: true,
            comments: false,
            width: 120

        });
        ast.print(this.formatCore.stream);
        this.formatCore.result = this.formatCore.stream.toString();
        fs.writeFileSync(this.formatCore.path, this.formatCore.result);
        console.log('===core=== compile :' + this.formatCore.path + '" successful!');

        // compress
        this.compressCore.result = uglify.minify(this.sourceCore.result, {
            fromString: true

        }).code;
        fs.writeFileSync(this.compressCore.path, this.compressCore.result);
        console.log('===core=== compile :' + this.compressCore.path + '" successful!');

        // gzip
        // 首先将compress的结果写入文件
        fs.writeFileSync(this.gzipCore.path + '_temp', this.compressCore.result);
        var zlib = require('zlib');
        var gz = zlib.createGzip({
            level: 9

        });
        var inp = fs.createReadStream(this.gzipCore.path + '_temp');
        var out = fs.createWriteStream(this.gzipCore.path);
        inp.pipe(gz).pipe(out);
        console.log('===core=== compile :' + this.gzipCore.path + '" successful!');
        fs.unlinkSync(this.gzipCore.path + '_temp');

        console.log('===core=== build finished');
    }

};

make.make();
