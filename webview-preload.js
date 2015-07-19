var ipc      = require('ipc')
var muxrpc   = require('muxrpc')
var pull     = require('pull-stream')
var pushable = require('pull-pushable')

// setup rpc connection with parent

var manifest = {
  'get'              : 'async',
  'whoami'           : 'async',
  'relatedMessages'  : 'async',
  'createFeedStream' : 'source',
  'createUserStream' : 'source',
  'createLogStream'  : 'source',
  'messagesByType'   : 'source',
  'links'            : 'source'
}

var ssb = muxrpc(manifest, null, serialize)()
function serialize (stream) { return stream }

var rpcStream = ssb.createStream()
var ipcPush = pushable()
ipc.on('muxrpc-ssb', function (msg) {
  try {
    if (typeof msg == 'string')
      msg = JSON.parse(msg)
  } catch (e) {
    return
  }
  ipcPush.push(msg)
})
pull(ipcPush, rpcStream, pull.drain(
  function (msg) { ipc.sendToHost('muxrpc-ssb', JSON.stringify(msg)) },
  function (err) { if (err) { console.error(err) } }
))

// exports

window.pull = pull
window.ssb  = ssb