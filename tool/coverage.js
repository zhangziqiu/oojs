var cli = require('../node_modules/istanbul/lib/cli.js');
cli.runToCompletion([ 'cover', 'tool/test.js', '--dir=test/coverage']);
