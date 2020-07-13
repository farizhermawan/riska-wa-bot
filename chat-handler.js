'use strict';

// const service = require('./service');
const admins = require('./config').admins;
const simpleRules = require('./config').simple_rules;
const rules = require('./config').rules;

const isAdmin = (sender) => {
  return admins.indexOf(sender.replace('@c.us', '')) !== -1;
};

const getUptime = () => {
  function format(param){
    let sec_num = parseInt(param, 10);
    let hours   = Math.floor(sec_num / 3600);
    let minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    let seconds = sec_num - (hours * 3600) - (minutes * 60);
    let days = 0;

    if (hours >= 24) {
      days = Math.floor(hours / 24);
      hours = hours % 24;
    }

    if (hours   < 10) hours   = "0"+hours;
    if (minutes < 10) minutes = "0"+minutes;
    if (seconds < 10) seconds = "0"+seconds;

    if (days > 0) return days + 'd ' + hours + 'h ' + minutes + 'm ' + seconds + 's';
    if (hours > 0) return hours + 'h ' + minutes + 'm ' + seconds + 's';
    if (minutes > 0) return minutes + 'm ' + seconds + 's';
    return seconds + 's';
  }
  return format(process.uptime());
};

const recent = {};

module.exports = {
  onMessageDelete: async (client, after, before) => {
    // if (before && before.body.length > 0) {
    //   if (client.info.me.user === before.from.substr(0, before.from.length - 5)) return;
    //   const user = await before.getContact();
    //   client.sendMessage(before.from, `Udah kebaca @${user.id.user} 😋`, {mentions: [user]});
    //   client.sendMessage(before.from, `-->  ${before.body}`);
    // } else {
    //   if (client.info.me.user === after.from.substr(0, after.from.length - 5)) return;
    //   client.sendMessage(after.from, 'Ah gak sempet baca 🤨');
    // }
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

    if (typeof recent[sender.id.user] === 'undefined') recent[sender.id.user] = {last_message: message, count: 1, blocked: false};
    else {
      if (recent[sender.id.user].blocked) return;

      if (recent[sender.id.user].last_message === message) {
        let count = recent[sender.id.user].count + 1;
        recent[sender.id.user].count = count;
        if (count === 2) {
          client.sendMessage(msg.from, "jangan spam ya, nanti aku cuekin.");
        } else {
          recent[sender.id.user].blocked = true;
          client.sendMessage(msg.from, "fix aku cuekin!");
        }
        return;
      } else {
        recent[sender.id.user].last_message = message;
        recent[sender.id.user].count = 1;
      }
    }

    if (message === 'hi') {
      client.sendMessage(msg.from, `Hi juga @${sender.id.user}`, {
        mentions: [sender]
      });
    }

    // if (simpleRules[message]) client.sendMessage(msg.from, simpleRules[message]);

    for (let i=0; i<rules.length; i++) {
      let rule = rules[i];
      if (new RegExp(rule.pattern).test(message)) {
        if (rule.mention_only && !isMentioned) continue;

        let response = rule.response;
        let option = {};
        if (rule.response.indexOf('@user') !== -1) {
          response = rule.response.replace('@user', `@${sender.id.user}`);
          option = {mentions: [sender]};
        }

        if (rule.reply) msg.reply(response, msg.from, option);
        else client.sendMessage(msg.from, response, option);

        break;
      }
    }

    if (!chat.isGroup && isAdmin(msg.from)) {
      if (message === 'uptime') client.sendMessage(msg.from, getUptime());
      else if (message.indexOf('unblock') !== -1) {
        let args = message.split(' ');
        recent[args[1]].blocked = false;
        client.sendMessage(msg.from, 'Done bosqu.');
      }
      else if (message === 'sync') {
        const BPH = await client.getChatById("6289523931573-1557316322@g.us");
        const RISKA = await client.getChatById("6285691535219-1484634629@g.us");

        let membersOfBph = BPH.participants.map((value, index) => value.id.user);
        let membersOfRiska = RISKA.participants.map((value, index) => value.id.user);

        let notAddedMember = [];
        membersOfBph.forEach((memberOfBph, index) => {
          if (membersOfRiska.indexOf(memberOfBph) === -1) notAddedMember.push(memberOfBph);
        });

        client.sendMessage(msg.from, "Ada " + notAddedMember.length + " BPH yang belum di add ke group RISKA");
        await RISKA.addParticipants(notAddedMember.map(value => value + '@c.us'));
        client.sendMessage(msg.from, "Semua member BPH berhasil di add ke group RISKA");
      }
    }

    // service.storeInbox(client.info.me.user, {
    //   from: msg.from,
    //   sender_id: sender.id.user,
    //   sender_name: sender.pushname || sender.name,
    //   group: chat.isGroup ? chat.name : null,
    //   message: msg.body
    // });
  }
};
