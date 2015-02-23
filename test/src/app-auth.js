var muxrpc = require('muxrpc')
var Serializer = require('pull-serializer')
var chan = require('ssb-channel')
var auth = require('ssb-domain-auth')
var loginBtn = document.getElementById('loginbtn')
var logoutBtn = document.getElementById('logoutbtn')

var ssb = muxrpc(require('ssb-manifest'), false, serialize)()
var ssbchan = chan.connect(ssb, 'localhost')
ssbchan.on('connect', function() {
  console.log('Connected')
  auth.getToken('localhost', function(err, token) {
    if (err) return ssbchan.close(), console.log('Token fetch failed', err)
    ssb.auth(token, function(err) {
      if (err) return ssbchan.close(), console.log('Auth failed')
      loginBtn.setAttribute('disabled', true)
      logoutBtn.removeAttribute('disabled')

      // a method we should have perms for
      ssb.whoami(function(err, id) {
        console.log('whoami', err, id)
      })
      // methods we should not have perms for
      ssb.getPublicKey(function (err, key) {
        console.log('getPublicKey', err, key)
      })
      ssb.gossip.peers(function (err, peers) {
        console.log('gossip.peers', err, peers)
      })
    })
  })
})
ssbchan.on('reconnecting', function() {
  console.log('Reconnecting')
})
ssbchan.on('error', function() {
  console.log('Connection failed')
  loginBtn.removeAttribute('disabled')
  logoutBtn.setAttribute('disabled', true)
})

loginBtn.onclick = function(e){
  e.preventDefault()
  auth.openAuthPopup('localhost', {
    title: '3rd-party App Auth Test',
    perms: ['whoami', 'add', 'messagesByType', 'createLogStream']
  }, function(err, granted) {
    if (granted)
      ssbchan.reconnect({ wait: 0 })
  })
}
logoutBtn.onclick = function(e){
  e.preventDefault()
  auth.deauth('localhost')
  ssbchan.close()
  loginBtn.removeAttribute('disabled')
  logoutBtn.setAttribute('disabled', true)
}

function serialize (stream) {
  return Serializer(stream, JSON, {split: '\n\n'})
}