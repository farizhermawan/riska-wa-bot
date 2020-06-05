'use strict';

const fetch = require('node-fetch');
const config = require('./config');

const post = (payload) => {
  return {
    method: 'post',
    body:    JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  };
};

const put = (payload) => {
  return {
    method: 'put',
    body:    JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  };
};

module.exports = {
  login: async (whatsapp_id) => {
    return await fetch(`${config.api_endpoint}/${whatsapp_id}`).then(res => res.json());
  },
  logout: async (whatsapp_id) => {
    return await fetch(`${config.api_endpoint}/${whatsapp_id}`, put({session: null})).then(res => res.json());
  },
  storeToken: async (payload) => {
    return await fetch(config.api_endpoint, post(payload)).then(res => res.json());
  },
  updateToken: async (payload) => {
    return await fetch(`${config.api_endpoint}/${payload.id}`, put(payload)).then(res => res.json());
  },
  storeInbox: async (whatsapp_id, payload) => {
    return await fetch(`${config.api_endpoint}/${whatsapp_id}/inboxes`, post(payload)).then(res => res.json());
  },
  getPendingOutboxes: async (whatsapp_id) => {
    return await fetch(`${config.api_endpoint}/${whatsapp_id}/outboxes/?status=PENDING`).then(res => res.json());
  },
  markAsSent: async (whatsapp_id, msg_id) => {
    return await fetch(`${config.api_endpoint}/${whatsapp_id}/outboxes/${msg_id}`, put({status: 'SENT'})).then(res => res.json());
  },
};
