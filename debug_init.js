const server = require('./.firebase/zip-sma/functions/server.js');
const wtfnode = require('wtfnode');
console.log('Successfully required server.js');

setTimeout(() => {
    console.log('--- Active Handles via wtfnode ---');
    wtfnode.dump();
    process.exit(0);
}, 2000);
