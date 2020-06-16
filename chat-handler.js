'use strict';

const service = require('./service');
const admins = require('./config').admins;
const simpleRules = require('./config').simple_rules;

const isAdmin = (sender) => {
  return admins.indexOf(sender.replace('@c.us', '')) !== -1;
};

const getUptime = () => {
  function format(param){
    let sec_num = parseInt(param, 10);
    let hours   = Math.floor(sec_num / 3600);
    let minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    let seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) hours   = "0"+hours;
    if (minutes < 10) minutes = "0"+minutes;
    if (seconds < 10) seconds = "0"+seconds;
    return hours+':'+minutes+':'+seconds;
  }
  return format(process.uptime());
};

module.exports = {
  onMessageDelete: async (client, after, before) => {
    if (before && before.body.length > 0) {
      if (client.info.me.user === before.from.substr(0, before.from.length - 5)) return;
      const user = await before.getContact();
      client.sendMessage(before.from, `Udah kebaca @${user.id.user} 😋`, {mentions: [user]});
      client.sendMessage(before.from, `-->  ${before.body}`);
    } else {
      if (client.info.me.user === after.from.substr(0, after.from.length - 5)) return;
      client.sendMessage(after.from, 'Ah gak sempet baca 🤨');
    }
  },
  onMessageReceived: async (client, msg) => {
    if (client.info.me.user === msg.from.substr(0, msg.from.length - 5)) return;

    const mentions = await msg.getMentions();
    const sender = await msg.getContact();
    const message = msg.body.trim().toLocaleLowerCase();
    const chat = await msg.getChat();

    let isMentioned = false;
    for(let contact of mentions) {
      if (contact.verifiedName === client.info.pushname) isMentioned = true;
    }

    if (message === 'hi') {
      client.sendMessage(msg.from, `Hi juga @${sender.id.user}`, {
        mentions: [sender]
      });
    }

    if (simpleRules[message]) client.sendMessage(msg.from, simpleRules[message]);

    if (!chat.isGroup && isAdmin(msg.from)) {
      if (message === 'uptime') client.sendMessage(msg.from, getUptime());
    }

    service.storeInbox(client.info.me.user, {
      from: msg.from,
      sender_id: sender.id.user,
      sender_name: sender.pushname || sender.name,
      group: chat.isGroup ? chat.name : null,
      message: msg.body
    });
  }
};
