var h = require('hyperscript')
var com = require('./index')

module.exports = function (app, peers) {

  // markup

  var rows = peers.sort(sorter).map(function (peer) { 
    var muted = (peer.connected) ? '' : '.text-muted'
    var id = '', status = ''

    if (peer.id) {
      id = com.userlink(peer.id, app.names[peer.id])
    } else
      id = peer.host

    if (peer.connected) {
      if (peer.time.connect)
        status = 'connected'
      else {
        if (peer.failure)
          status = 'connecting (try '+(peer.failure+1)+')...'
        else
          status = 'connecting...'
      }
    }
    return h('tr',
      h('td'+muted, id, ' ', status)
    )
  })

  // put followed and trusted friends at top
  function sorter(a, b) {
    var an = 0, bn = 0
    if (a.connected) an += 100
    if (b.connected) bn += 100
    if (a.failure) an -= a.failure
    if (b.failure) bn -= b.failure
    return bn - an
  }

  return rows
}