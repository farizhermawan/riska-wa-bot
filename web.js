const app = require('express')();
const http = require('http').createServer(app);
const log = require('simple-node-logger').createSimpleLogger('console.log');
const bot = require('./bot');

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/console.log');
});

http.listen(3000, () => {
  log.info('listening on *:3000');
});

bot.run();

process.on('uncaughtException', (e) => {
  console.error(e);
});

