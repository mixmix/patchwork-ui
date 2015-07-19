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
  ui.setPage('webview', webview, { onPageTeardown: function () { window.removeEventListener('resize', resize) }})
  setupRpc(webview)

  // dynamically size the webview

  resize()
  window.addEventListener('resize', resize)
  function resize () {
    var obj = webview.querySelector('::shadow object')
    obj.style.height = (window.innerHeight - obj.offsetTop) + 'px'
  }
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