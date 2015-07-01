var ipc        = require('ipc')
var muxrpc     = require('muxrpc')
var loadManf   = require('ssb-manifest/load')
var pull       = require('pull-stream')
var pushable   = require('pull-pushable')

module.exports = function () {
  // fetch config
  var config = ipc.sendSync('fetch-config')
  console.log('got config', config)

  // create rpc object
  var ssb = muxrpc(loadManf(config), null, serialize)()
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