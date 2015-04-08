'use strict'
var muxrpc       = require('muxrpc')
var Serializer   = require('pull-serializer')
var auth         = require('ssb-domain-auth')

//the SSB_MANIFEST variable is created by /manifest.js
//which is loaded before the javascript bundle.

var ssb        = muxrpc(SSB_MANIFEST, false, function (stream) { return Serializer(stream, JSON, {split: '\n\n'}) })()
var localhost  = require('ssb-channel').connect(ssb, 'localhost')
var phoenix    = require('./app')(ssb)

localhost.on('connect', function() {
  // authenticate the connection
  auth.getToken(window.location.host, function(err, token) {
    if (err) return localhost.close(), console.error('Token fetch failed', err)
    ssb.auth(token, function(err) {
      phoenix.ui.setStatus(false)
      phoenix.setupRpcConnection()
      phoenix.refreshPage()
    })
  })
})

localhost.on('error', function(err) {
  // inform user and attempt a reconnect
  console.log('Connection Error', err)
  phoenix.ui.setStatus('danger', 'Lost connection to the host program. Please restart the host program. Trying again in 10 seconds.')
  localhost.reconnect()
})

localhost.on('reconnecting', function(err) {
  console.log('Attempting Reconnect')
  phoenix.ui.setStatus('danger', 'Lost connection to the host program. Reconnecting...')
})

phoenix.h      = require('hyperscript')
phoenix.pull   = require('pull-stream')
window.phoenix = phoenix
