const app = require('express')();
const http = require('http').createServer(app);
const qr = require("qr-image");
const { WebClient } = require('@slack/web-api');
const log = require('simple-node-logger').createSimpleLogger('console.log');
const bot = require('./bot');

const slack = new WebClient(process.env.SLACK_TOKEN);
const conversationId = process.env.CHANNEL_ID;

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/console.log');
});

app.get('/qr', (req, res) => {
  const qrCode = bot.qr();
  const botInfo = bot.info();
  if (qrCode == null) {
    if (botInfo == null) res.send('QR not ready!');
    else res.send('Already logged in as ' + botInfo);
  }
  else {
    const image = qr.image(qrCode, { type: 'svg' });
    res.type('svg');
    image.pipe(res);
  }
});

app.get('/run', (req, res) => {
  const botInfo = bot.info();
  const qrCode = bot.qr();
  if (botInfo == null && qrCode == null) {
    bot.run(false);
    res.send('Bot triggered, open QR to connect!');
  }
  else res.send('Already logged in' + (botInfo === null ? '!' : ' as ' + botInfo));
});

http.listen(process.env.PORT || 3000, () => {
  log.info('listening on *:3000');
  slack.chat.postMessage({ channel: conversationId, text: 'Application restarted!' });
});

bot.run(true);
