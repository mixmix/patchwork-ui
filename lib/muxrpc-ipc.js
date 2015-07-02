var ipc        = require('ipc')
var muxrpc     = require('muxrpc')
var loadManf   = require('ssb-manifest/load')
var pull       = require('pull-stream')
var pushable   = require('pull-pushable')

module.exports = function () {
  // fetch manifest
  var manifest = ipc.sendSync('fetch-manifest')
  console.log('got manifest', manifest)

  // create rpc object
  var ssb = muxrpc(manifest, null, serialize)()
  function serialize (stream) { return stream }

  // setup rpc stream over ipc
  var rpcStream = ssb.createStream()
  var ipcPush = pushable()
  ipc.on('muxrpc-ssb', function (msg) { ipcPush.push(msg) })
  pull(ipcPush, rpcStream, pull.drain(
    function (msg) { ipc.send('muxrpc-ssb', msg) },
    function (err) { if (err) { console.error(err) } }
  ))

  return ssb
}