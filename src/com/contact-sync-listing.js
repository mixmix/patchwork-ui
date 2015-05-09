var h = require('hyperscript')
var com = require('./index')
var u = require('../lib/util')
  /*{
    "host": "pub.dinosaur.is",
    "port": 8008,
    "time": {
      "connect": 1431105369860,
      "attempt": 1431105549574
    },
    "connected": true,
    "id": "uHn+0odK8mnTViRwVnutQkwDqwaioiMkU2eDFbNrzcI=.blake2s",
    "failure": 0
  },*/

module.exports = function (app, peers, follows) {
  var connectedPeers = peers.filter(function (p) { return !!p.id })

  if (connectedPeers.length === 0) {
    var str = (peers.length > 0) ? 'Connecting to the network...' : 'You have not yet connected to any peers.'
    return h('.contact-sync-listing.empty.text-muted', str)
  }

  return h('.contact-sync-listing', connectedPeers.map(function (peer) {
    function filterFn (prof) {
      return follows[peer.id] && follows[peer.id][prof.id]
    }
    var status, history
    if (peer.connected) {
      if (peer.time && peer.time.connect)
        status = 'Syncing...'
      else {
        if (peer.failure)
          status = 'Connecting (try '+(peer.failure+1)+')...'
        else
          status = 'Connecting...'
      }
    }
    if (peer.time) {
      if (peer.time.connect > peer.time.attempt)
        history = 'connected '+u.prettydate(peer.time.connect, true)
      else if (peer.time.attempt) {
        if (peer.connected)
          history = 'started attempt '+u.prettydate(peer.time.attempt, true)
        else
          history = 'attempted connect '+u.prettydate(peer.time.attempt, true)
      }
    }
    return h('.peer',
      h('.peer-title', { 'data-history': history }, com.userHexagon(app, peer.id, 60), ' ', com.user(app, peer.id), ' ', h('small.text-muted', status)),
      com.contactFeed(app, { filter: filterFn, follows: follows })
    )
  }))
}