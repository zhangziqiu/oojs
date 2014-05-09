var make = {
    name: 'make',
    sourceFiles: {
        coreFilePath: "./src/core.js",
        eventFilePath: "./src/event.js",
        loaderFilePath: "./src/loader.js"
    },
    source: {
        result: "",
        path: './bin/oojs.source.js',
        stream: null
    },
    format: {
        result: "",
        path: './bin/oojs.format.js',
        stream: null
    },
    compress: {
        result: "",
        path: './bin/oojs.compress.js',
        stream: null
    },
    gzip: {
        result: "",
        path: './bin/oojs.compress.js.gz',
        stream: null
    },

    compile: function () {
        var result = "";
        var fs = require('fs');
        var path, key;

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

    make: function () {
        //为Function对象添加proxy函数
        Function.prototype.proxy = function (context) {
            var method = this;
            var args = Array.prototype.slice.apply(arguments);
            var obj = args.shift();
            return function () {
                var tempArgs = Array.prototype.slice.apply(arguments);
                return method.apply(obj, tempArgs.concat(args));
            }
        }

        try {
            var uglify = require('uglify-js');            
        }
        catch (ex) {
            this.preinstall(this.build.proxy(this));
        }
		this.build();
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

        //获取合并后的文件字符串
        var sourceString = this.compile();
        var fs = require('fs');
        var uglify = require("uglify-js");
        var ast = uglify.parse(sourceString);

        //source
        this.source.stream = uglify.OutputStream({
            beautify: true,
            comments: true,
            width: 120
        });
        ast.print(this.source.stream);
        this.source.result = this.source.stream.toString();
        fs.writeFileSync(this.source.path, this.source.result);
        console.log('compile :' + this.source.path + '" successful!');

        //format
        this.format.stream = uglify.OutputStream({
            beautify: true,
            comments: false,
            width: 120
        });
        ast.print(this.format.stream);
        this.format.result = this.format.stream.toString();
        fs.writeFileSync(this.format.path, this.format.result);
        console.log('compile :' + this.format.path + '" successful!');

        //compress
        this.compress.result = uglify.minify(this.source.result, {
            fromString: true
        }).code;
        fs.writeFileSync(this.compress.path, this.compress.result);
        console.log('compile :' + this.compress.path + '" successful!');

        //gzip
        //首先将compress的结果写入文件
        fs.writeFileSync(this.gzip.path + "_temp", this.compress.result);
        var zlib = require('zlib');
        var gz = zlib.createGzip({
            level: 9
        })
        var inp = fs.createReadStream(this.gzip.path + "_temp");
        var out = fs.createWriteStream(this.gzip.path);
        inp.pipe(gz).pipe(out);
        console.log('compile :' + this.gzip.path + '" successful!');
        fs.unlinkSync(this.gzip.path + "_temp");
		

        console.log('build finished');
    }
}

make.make();