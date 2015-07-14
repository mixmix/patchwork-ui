'use strict'
var pull = require('pull-stream')
var ui   = require('./lib/ui')

// Init
// ====

// master state object
window.app = require('./lib/app')

// toplevel events
window.addEventListener('hashchange', ui.refreshPage)
document.body.addEventListener('click', onClick)
pull(app.ssb.phoenix.createEventStream(), pull.drain(onIndexEvent))
pull(app.ssb.blobs.changes(), pull.drain(onBlobDownloaded))

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
  if (event.type == 'home-add')
    ui.setNewMessageCount(ui.getNewMessageCount() + 1)
  if (-1 !== ['inbox-add', 'inbox-remove', 'votes-add', 'votes-remove', 'follows-add', 'follows-remove'].indexOf(event.type))
    ui.renderNav()
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