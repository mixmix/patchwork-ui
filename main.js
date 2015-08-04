'use strict'
var pull = require('pull-stream')
var ui   = require('./lib/ui')

// Init
// ====

// master state object
window.app = require('./lib/app')

// toplevel events
window.addEventListener('hashchange', ui.refreshPage)
window.addEventListener('contextmenu', ui.contextMenu)
document.body.addEventListener('click', onClick)
pull(app.ssb.patchwork.createEventStream(), pull.drain(onIndexEvent))
pull(app.ssb.blobs.changes(), pull.drain(onBlobDownloaded))
pull(app.ssb.gossip.changes(), pull.drain(onGossipEvent))
app.observ.newPosts(onNewPost)

// render
ui.refreshPage()

// Handlers
// ========

// look for link clicks which should trigger same-page refreshes
function onClick (e) {
  var el = e.target
  while (el) {
    if (el.tagName == 'A' && el.origin == window.location.origin && el.hash && el.hash == window.location.hash) {
      e.preventDefault()
      e.stopPropagation()
      ui.refreshPage()
      return
    }
    el = el.parentNode
  }
}

// update UI to reflect index changes
function onIndexEvent (event) {
  console.log('onIndexEvent', event)
  if (event.type == 'home-add')
    app.observ.newPosts(1 + app.observ.newPosts())
  if (event.type == 'index-change') {
    app.indexCounts[event.index] = event.total
    app.indexCounts[event.index+'Unread'] = event.unread
    app.observ.indexCounts[event.index](event.total)
    app.observ.indexCounts[event.index+'Unread'](event.unread)
  }
}

// render blobs as they come in
function onBlobDownloaded (hash) {
  // hash downloaded, update any images
  var els = document.querySelectorAll('img[src^="blob:'+hash+'"]')
  for (var i=0; i < els.length; i++)
    els[i].src = 'blob:'+hash
  var els = document.querySelectorAll('[data-bg^="blob:'+hash+'"]')
  for (var i=0; i < els.length; i++)
    els[i].style.backgroundImage = 'url(blob:'+hash+')'
}

function onGossipEvent (e) {
  // make sure 'connected' is right
  if (e.type == 'disconnect')
    e.peer.connected = false
  console.log(e)

  // update the peers
  var i
  for (i=0; i < app.peers.length; i++) {
    if (app.peers[i].key == e.peer.key) {
      app.peers[i] = e.peer
      break
    }
  }
  if (i == app.peers.length)
    app.peers.push(e.peer)
  app.observ.peers(app.peers)
}

// update title to show when new messages are available
function onNewPost (n) {
  n = (n<0)?0:n
  var name = app.users.names[app.user.id] || 'New Account'
  if (n) {
    document.title = '-=[ ('+n+') Patchwork : '+name+' ]=-'
  } else {
    document.title = '-=[ Patchwork : '+name+' ]=-'
  }
}