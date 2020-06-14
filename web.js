const app = require('express')();
const http = require('http').createServer(app);
const qr = require("qr-image");
const log = require('simple-node-logger').createSimpleLogger('console.log');
const bot = require('./bot');

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/console.log');
});

app.get('/qr', (req, res) => {
  const qrCode = bot.qr();
  if (qrCode == null) res.send('QR not ready!');
  else {
    const image = qr.image(qrCode, { type: 'svg' });
    res.type('svg');
    image.pipe(res);
  }
});

http.listen(process.env.PORT || 3000, () => {
  log.info('listening on *:3000');
});

bot.run();
