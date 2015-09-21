var fs = require('fs');
var path = require('path');
// Then, you need to use the method "addFile" on the mocha
// object for each file.

// Here is an example:
fs.readdirSync('test/benchmark').filter(function(file){
    // Only keep the .js files
    return file.substr(-13) === '.benchmark.js';
}).forEach(function(file){
	require('../test/benchmark/'+file);
});
