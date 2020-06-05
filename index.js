const qrcode = require('qrcode-terminal');
const { Client } = require('whatsapp-web.js');
const service = require('./service');
const handler = require('./chat-handler');
const config = require('./config');

const initialize = (bot) => {
  const client = new Client({
    session: bot.session,
    authTimeoutMs: 5000,
  });

  client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
  });

  client.on('authenticated', (session) => {
    console.log("Authentication success");
    bot.session = session;
  });

  client.on('auth_failure', async () => {
    console.error('AUTHENTICATION FAILURE');
    await service.logout(bot.id);
    console.log('Session has been removed, please try to re-run');
  });

  client.on('ready', async () => {
    let payload = {
      id: client.info.me.user,
      name: client.info.pushname,
      session: bot.session
    };

    let profile = await service.login(payload.id);
    if (profile.error) {
      console.log(`Registering ${payload.name} [${payload.id}]`);
      service.storeToken(payload);
    } else {
      console.log(`Update session for ${payload.name} [${payload.id}]`);
      service.updateToken(payload);
    }

    bot = payload;
    console.log('Client is ready!');

    setInterval(() => {
      let run = async () => {
        try {
          let pendingOutboxes = await service.getPendingOutboxes(bot.id);
          if (pendingOutboxes.error) {
            console.error(pendingOutboxes);
          } else {
            if (pendingOutboxes.data.length > 0) {
              let outbox = pendingOutboxes.data[0];
              console.log(`Sending a message from pending outbox [${outbox.id}]`);
              client.sendMessage(outbox.to, outbox.message, outbox.option || {});
              service.markAsSent(bot.id, outbox.id);
            }
          }
        } catch (e) {
          console.log(e);
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

const main = async () => {
  let credential = {id: config.instance_id, name: null, session: null};
  console.log({msg: `try to resuming instance.. [${credential.id}]`});
  try {
    let response = await service.login(credential.id);
    if (response.error) {
      console.error(response);
      process.exit();
    }
    credential = response;
  } catch (e) {
    console.error(e.message);
  }
  initialize(credential);
};

main();

process.on('uncaughtException', (e) => {
  console.error(e);
});

