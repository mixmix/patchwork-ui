'use strict'
var auth       = require('ssb-domain-auth')
var SSBClient  = require('ssb-client')

var ssb = SSBClient()
ssb.connect()

var blobhash = window.location.pathname.slice('/ext/'.length)
var i = blobhash.indexOf('.blake2s')
blobhash = blobhash.slice(0, i+('.blake2s'.length))

document.getElementById('fileid').innerHTML = blobhash

// periodically poll for the file
setInterval(pollBlob, 10e3)

// rpc connection
ssb.on('connect', function() {
  // authenticate the connection
  auth.getToken(window.location.host, function(err, token) {
    if (err) return ssb.close(), console.error('Token fetch failed', err)
    ssb.auth(token, function(err) {
      if (err) return ssb.close(), console.error('RPC auth failed', err)
    })
  })
})
ssb.on('close', function() {
  // inform user and attempt a reconnect
  console.log('Connection Lost')
  ssb.reconnect({ wait: 10e3 })
})
ssb.on('reconnecting', function() {
  console.log('Attempting Reconnect')
})

function pollBlob () {
  if (ssb.closed)
    return
  console.log('checking...')
  ssb.blobs.has(blobhash, function (err, has) {
    if (has) {
      console.log('blob found, reloading')
      window.location.reload()
    } else
      console.log('not yet found')
  })
}