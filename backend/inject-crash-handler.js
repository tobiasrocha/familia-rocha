const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');
const handlers = `
process.on('uncaughtException', (err) => require('fs').appendFileSync('crash.log', new Date().toISOString() + ' ' + (err ? err.stack : 'Unknown error') + '\\n'));
process.on('unhandledRejection', (err) => require('fs').appendFileSync('crash.log', new Date().toISOString() + ' ' + (err ? err.stack : 'Unknown rejection') + '\\n'));
`;
code = handlers + code;
fs.writeFileSync('server.js', code);
