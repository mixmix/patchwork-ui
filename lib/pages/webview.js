'use strict'
var h = require('hyperscript')
var com = require('../com')
var app = require('../app')
var isref = require('ssb-ref')
var muxrpc = require('muxrpc')
var pull     = require('pull-stream')
var pushable = require('pull-pushable')

module.exports = function () {
  var param = app.page.param
  var url = 'http://localhost:' + ((isref.isHash(param)) ? 7777 : 7778) + '/' + param

  // markup

  var webview = h('webview', { src: url, preload: './webview-preload.js' })
  ui.setPage('webview', h('.layout-grid',
    h('.layout-grid-col.webview-left', webview),
    h('.layout-grid-col.webview-right.comments.hide', comments()),
    h('.layout-grid-col.webview-right.edit.hide', editor(url))
  ), { onPageTeardown: function () { window.removeEventListener('resize', resize) }})
  setupRpc(webview)

  // dynamically size the webview

  resize()
  window.addEventListener('resize', resize)
  function resize () {
    [
      [webview.querySelector('::shadow object'), 0],
      [document.querySelector('.webview-page .comments'), 0],
      [document.querySelector('.webview-page .edit textarea'), 60]
    ].forEach(function (entry) {
      entry[0].style.height = (window.innerHeight - entry[0].offsetTop - entry[1]) + 'px'
    })
  }
}

function comments () {

  // markup

  function feed (opts) {
    opts = opts || {}
    opts.keys = true
    opts.values = true
    opts.dest = app.page.param
    opts.type = 'ext'
    return app.ssb.links(opts)
  }

  return com.messageFeed({ feed: feed, onefetch: true })
}

function editor (url) {

  // markup

  var textarea = h('textarea.form-control')

  // fetch from the server
  var xhr = new XMLHttpRequest()
  xhr.open('GET', url)
  xhr.responseType = 'text'
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4)
      textarea.textContent = xhr.responseText
  }
  xhr.send()

  return textarea
}

var manifest = {
  'get'              : 'async',
  'getPublicKey'     : 'async',
  'whoami'           : 'async',
  'relatedMessages'  : 'async',
  'createFeedStream' : 'source',
  'createUserStream' : 'source',
  'createLogStream'  : 'source',
  'messagesByType'   : 'source',
  'links'            : 'source'
}

function setupRpc (webview) {
  var ssb = muxrpc(null, manifest, serialize)(app.ssb)
  function serialize (stream) { return stream }

  var rpcStream = ssb.createStream()
  var ipcPush = pushable()
  webview.addEventListener('ipc-message', function (e) {
    var msg = e.args[0]
    try {
      if (typeof msg == 'string')
        msg = JSON.parse(msg)
    } catch (e) {
      return
    }
    ipcPush.push(msg)
  })
  pull(ipcPush, rpcStream, pull.drain(
    function (msg) { webview.send('muxrpc-ssb', JSON.stringify(msg)) },
    function (err) { if (err) { console.error(err) } }
  ))
}