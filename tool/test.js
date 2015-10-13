var Mocha = require('mocha'),
    fs = require('fs'),
    path = require('path');

// First, you need to instantiate a Mocha instance.
var mocha = new Mocha();

// Then, you need to use the method "addFile" on the mocha
// object for each file.

// Here is an example:
fs.readdirSync('test/unit').filter(function(file){
    // Only keep the .js files
    return file.substr(-8) === '.unit.js';
    // return file === 'oojs.core.js';

}).forEach(function(file){
    // Use the method "addFile" to add the file to mocha
    mocha.addFile(
        path.join('test/unit', file)
    );
});

// Now, you can run the tests.
mocha.run(function(failures){
  process.on('exit', function () {
    process.exit(failures);
  });
});