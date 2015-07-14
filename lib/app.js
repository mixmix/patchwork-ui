'use strict'

/*
Application Master State
========================
Common state which either exists as part of the session,
or which has  been  loaded  from  scuttlebot during page
refresh because  its  commonly  needed during rendering.
*/

var o         = require('observable')
// var SSBClient  = require('ssb-client')
var SSBClient = require('./muxrpc-ipc')
var emojis    = require('emoji-named-characters')

// master state object
module.exports = {
  // sbot rpc connection
  ssb: SSBClient(),

  // page params parsed from the url
  page: {
    id: 'home',
    param: null,
    qs: {}
  },

  // ui data
  suggestOptions: { 
    ':': Object.keys(emojis).map(function (emoji) {
      return {
        image: '/img/emoji/' + emoji + '.png',
        title: emoji,
        subtitle: emoji,
        value: emoji + ':'
      }
    }),
    '@': []
  },
  homeMode: {
    view: 'all',
    live: false
  },
  filters: {
    nsfw: true,
    spam: true,
    abuse: true
  },

  // application state, fetched every refresh
  actionItems: null,
  indexCounts: {},
  user: {
    id: null,
    profile: null
  },
  users: {
    names: null,
    profiles: null
  },
  peers: null,

  // global observables, updated by persistent events
  observ: {
    peers: o([])
  }
}