'use strict';

const fetch = require('node-fetch');
const config = require('./config');

module.exports = {
  login: async (whatsapp_id) => {
    return await fetch(`${config.api_endpoint}/${whatsapp_id}`).then(res => res.json());
  },
  storeToken: (payload) => {
    fetch(config.api_endpoint, {
      method: 'post',
      body:    JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    });
  },
  updateToken: (payload) => {
    fetch(`${config.api_endpoint}/${payload.id}`, {
      method: 'put',
      body:    JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    });
  },
  getPendingOutboxes: async (whatsapp_id) => {
    return await fetch(`${config.api_endpoint}/${whatsapp_id}/outboxes/?status=PENDING`).then(res => res.json());
  },
  markAsSent: (whatsapp_id, msg_id) => {
    fetch(`${config.api_endpoint}/${whatsapp_id}/outboxes/${msg_id}`, {
      method: 'put',
      body:    JSON.stringify({status: 'SENT'}),
      headers: { 'Content-Type': 'application/json' },
    });
  },
  storeInbox: (whatsapp_id, payload) => {
    fetch(`${config.api_endpoint}/${whatsapp_id}/inboxes/`, {
      method: 'post',
      body:    JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
