'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var pull = require('pull-stream')
var multicb = require('multicb')
var com = require('../com')
var u = require('../util')

module.exports = function (app) {

  app.ssb.gossip.peers(function (err, peers) {

    // listeners

    var gc = app.ssb.gossip.changes()
    pull(gc, pull.drain(function (e) {
      var el = peersEl.querySelector('.peer[data-id="'+e.peer.id+'"]')
      if (e.type == 'discover' && !el)
        peersEl.appendChild(renderPeer(e.peer))
      if (e.type == 'connect' && el)
        el.classList.add('connected')
      if (e.type == 'disconnect' && el) {
        el.querySelector('.last-connect').innerText = lastconnect(e.peer)
        el.classList.remove('connected')
      }
    }))
    var rc = app.ssb.replicate.changes()
    pull(rc, pull.drain(function (e) {
      console.log(e)
      var el = peersEl.querySelector('.peer[data-id="'+e.peerid+'"]')
      if (!el) return
      if (e.type == 'start')
        setprogress(el, 0)
      if (e.type == 'finish' || (e.type == 'progress' && e.total == 0))
        setprogress(el, 100)
      if (e.type == 'progress')
        setprogress(el, Math.round(e.progress / e.total) * 100)
    }))

    // markup

    var peersEl = h('.peers', peers.map(renderPeer))
    app.setPage('sync', h('.layout-onecol',
      h('.layout-main', com.welcomehelp(app), peersEl)
    ), { onPageTeardown: function () {
      // abort event streams
      gc(true, function(){});
      rc(true, function(){})
    }})

    function lastconnect (peer) {
      if (peer.time) {
        if (peer.time.connect > peer.time.attempt)
          return 'synced '+(new Date(peer.time.connect).toLocaleString())
        else if (peer.time.attempt) {
          return 'attempted (but failed) to connect at '+(new Date(peer.time.attempt).toLocaleString())
        }
      }
      return ''
    }

    function setprogress (el, p) {
      el.querySelector('.progress-bar').style.width = p + '%'
    }

    function renderPeer (peer) {
      function onsync (e) {
        e.preventDefault()
        app.ssb.gossip.connect({ host: peer.host, port: peer.port, key: peer.key }, function (){})
      }

      return h('.peer' + ((peer.connected)?'.connected':''), { 'data-id': peer.id },
        com.userHexagon(app, peer.id, 80),
        h('.details',
          h('h3',
              com.userName(app, peer.id), ' ', h('small', peer.host),
              ' ', h('a.btn.btn-3d.btn-xs', { href: '#', onclick: onsync }, 'Sync')
            ),
          h('.progress', h('.progress-bar.progress-bar-striped.active', h('span', 'Syncing...'))),
          h('p.last-connect', lastconnect(peer))
        )
      )
    }
  })
}
