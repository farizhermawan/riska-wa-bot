const prompt = require('prompt');
const qrcode = require('qrcode-terminal');
const { Client } = require('whatsapp-web.js');
const service = require('./service');
const handler = require('./chat-handler');

const initialize = (bot) => {
  const client = new Client({
    session: bot.session,
    puppeteer: {
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    }
  });

  client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
  });

  client.on('authenticated', (session) => {
    console.log("Authentication success");
    bot.session = session;
  });

  client.on('auth_failure', msg => {
    console.error('AUTHENTICATION FAILURE', msg);
  });

  client.on('ready', () => {
    let payload = {
      id: client.info.me.user,
      name: client.info.pushname,
      session: bot.session
    };

    if (bot.id == null) {
      console.log(`Registering ${payload.name} [${payload.id}]`);
      service.storeToken(payload);
    } else {
      console.log(`Update session for ${payload.name} [${payload.id}]`);
      service.updateToken(payload);
    }

    console.log('Client is ready!');

    setInterval(() => {
      let run = async () => {
        let pendingOutboxes = await service.getPendingOutboxes(bot.id);
        if (pendingOutboxes.data.length > 0) {
          let outbox = pendingOutboxes.data[0];
          console.log(`Sending a message from pending outbox [${outbox.id}]`);
          client.sendMessage(outbox.to, outbox.message, outbox.option || {});
          service.markAsSent(bot.id, outbox.id);
        }
      };

      run();
    }, 10000);
  });

  client.on('message', async (msg) => {
    handler.onMessageReceived(client, msg);
  });

  client.on('message_revoke_everyone', async (after, before) => {
    handler.onMessageDelete(client, after, before);
  });

  client.initialize();
};

prompt.start();
prompt.get(['whatsapp_id'], async function (err, result) {
  let credential = {id: null, name: null, session: null};
  if (result.whatsapp_id.length > 0) {
    try {
      let response = await service.login(result.whatsapp_id);
      if (response.error) {
        console.error(response);
        process.exit(1);
      }
    } catch (e) {
      console.error(e.message);
    }
    credential = response;
  }
  initialize(credential);
});
