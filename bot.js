const qrcode = require('qrcode-terminal');
const { Client } = require('whatsapp-web.js');
const { WebClient } = require('@slack/web-api');

const service = require('./service');
const handler = require('./chat-handler');
const config = require('./config');

const log = require('simple-node-logger').createSimpleLogger('console.log');
const slack = new WebClient(process.env.SLACK_TOKEN);
const conversationId = process.env.CHANNEL_ID;

let qrCode = null;
let botInfo = null;
let isResuming = false;

const initialize = (bot) => {
  const client = new Client({
    session: bot.session,
    authTimeoutMs: 5000,
    puppeteer: {
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  });

  client.on('qr', qr => {
    if (isResuming) {
      log.info('Session is not valid anymore, please try to re-run');
      qrCode = null;
      slack.chat.postMessage({ channel: conversationId, text: 'Session expired!' });
      process.exit(1);
    }
    qrcode.generate(qr, {small: true});
    qrCode = qr;
  });

  client.on('authenticated', (session) => {
    log.info("Authentication success");
    bot.session = session;
    qrCode = null;
    slack.chat.postMessage({ channel: conversationId, text: 'Starting new session!' });
  });

  client.on('auth_failure', async () => {
    log.error('AUTHENTICATION FAILURE');
    await service.logout(bot.id);
    log.info('Session has been removed, please try to re-run');
    qrCode = null;
    slack.chat.postMessage({ channel: conversationId, text: 'Authentication failure!' });
    process.exit(1);
  });

  client.on('disconnected', async () => {
    log.info('Client was logged out');
    await service.logout(bot.id);
    log.info('Session has been removed, please try to re-run');
    qrCode = null;
    slack.chat.postMessage({ channel: conversationId, text: 'Session disconnected!' });
    process.exit(1);
  });

  client.on('ready', async () => {
    let payload = {
      id: client.info.me.user,
      name: client.info.pushname,
      session: bot.session
    };

    botInfo = client.info.pushname;

    let profile = await service.login(payload.id);
    if (profile.error) {
      log.info(`Registering ${payload.name} [${payload.id}]`);
      service.storeToken(payload);
    } else {
      log.info(`Update session for ${payload.name} [${payload.id}]`);
      service.updateToken(payload);
    }

    bot = payload;
    log.info('Client is ready!');

    setInterval(() => {
      let run = async () => {
        try {
          let pendingOutboxes = await service.getPendingOutboxes(bot.id);
          if (pendingOutboxes.error) {
            log.error(pendingOutboxes);
          } else {
            if (pendingOutboxes.data.length > 0) {
              let outbox = pendingOutboxes.data[0];
              log.info(`Sending a message from pending outbox [${outbox.id}]`);
              if (bot.id !== outbox.to.substr(0, outbox.to.length - 5)) {
                client.sendMessage(outbox.to, outbox.message, outbox.option || {});
              }
              service.markAsSent(bot.id, outbox.id);
            }
          }
        } catch (e) {
          console.error(e);
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

module.exports = {
  run: async (resuming) => {
    let credential = {id: config.instance_id, name: null, session: null};
    log.info(`try to resuming instance.. [${credential.id}]`);
    try {
      let response = await service.login(credential.id);
      if (response.error) {
        log.error(response);
        process.exit();
      }
      credential = response;
    } catch (e) {
      log.error(e.message);
    }
    if (resuming === false) {
      isResuming = false;
      initialize(credential);
    }
    else {
      if (credential.session !== null) {
        isResuming = true;
        initialize(credential);
      }
    }
  },
  qr: () => {
    return qrCode;
  },
  info: () => {
    return botInfo;
  }
};
