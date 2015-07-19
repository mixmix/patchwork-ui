var ipc        = require('ipc')
var muxrpc     = require('muxrpc')
var pull       = require('pull-stream')
var pushable   = require('pull-pushable')
var ui         = require('./ui')

var clientApiManifest = {
  navigate: 'async',
  contextualToggleDevTools: 'async'
}

var clientApi = {
  navigate: function (path, cb) {
    window.location.hash = '#/webview/'+path
    cb()
  },
  contextualToggleDevTools: function (cb) {
    ui.toggleDevTools()
    cb()
  }
}

module.exports = function () {
  // fetch manifest
  var manifest = ipc.sendSync('fetch-manifest')
  console.log('got manifest', manifest)

  // create rpc object
  var ssb = muxrpc(manifest, clientApiManifest, serialize)(clientApi)
  function serialize (stream) { return stream }

  // setup rpc stream over ipc
  var rpcStream = ssb.createStream()
  var ipcPush = pushable()
  ipc.on('muxrpc-ssb', function (msg) {
    try {
      if (typeof msg == 'string')
        msg = JSON.parse(msg)
    } catch (e) {
      return
    }

    if (msg.bvalue) {
      // convert buffers to back to binary
      msg.value = new Buffer(msg.bvalue, 'base64')
      delete msg.bvalue
    }
    ipcPush.push(msg)
  })
  pull(ipcPush, rpcStream, pull.drain(
    function (msg) { 
      if (msg.value && Buffer.isBuffer(msg.value)) {
        // convert buffers to base64
        msg.bvalue = msg.value.toString('base64')
        delete msg.value
      }
      ipc.send('muxrpc-ssb', JSON.stringify(msg))
    },
    function (err) { if (err) { console.error(err) } }
  ))

  return ssb
}