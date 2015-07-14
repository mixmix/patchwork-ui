'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var pull = require('pull-stream')
var multicb = require('multicb')
var app = require('../app')
var ui = require('../ui')
var modals = require('../ui/modals')
var com = require('../com')
var u = require('../util')
var social = require('../social-graph')

module.exports = function () {

  // listeners

  var gc = app.ssb.gossip.changes()
  pull(gc, pull.drain(function (e) {
    updatepeer(e.peer)
    var el = peersEl.querySelector('.peer[data-id="'+e.peer.key+'"]')
    if (e.type == 'discover' && !el)
      peersEl.appendChild(renderPeer(e.peer))
    if (e.type == 'connect' && el)
      el.classList.add('connected')
    if (e.type == 'disconnect' && el) {
      setlastconnect(el, e.peer)
      el.classList.remove('connected')
    }
  }))
  var rc = app.ssb.replicate.changes()
  pull(rc, pull.drain(function (e) {
    var el = peersEl.querySelector('.peer[data-id="'+e.peerid+'"]')
    if (!el) return
    el.classList.add('connected') // make sure we're rendering as connected
    if (e.type == 'start')
      setprogress(el, 0, '')
    if (e.type == 'finish' || (e.type == 'progress' && e.total == 0))
      setprogress(el, 100, 'Syncing...')
    if (e.type == 'progress')
      setprogress(el, Math.round(e.progress / e.total * 100), 'Syncing...')
  }))

  // markup

  var pubStatusEl = h('.pub-status')
  var peersEl = h('.peers', h('h3', 'Network'), app.peers.map(renderPeer))
  ui.setPage('sync', h('.layout-onecol',
    h('.layout-main', pubStatusEl, peersEl)
  ), { onPageTeardown: function () {
    // abort event streams
    gc(true, function(){})
    rc(true, function(){})
  }})
  setpubstatus()

  function setpubstatus () {
    var stats = u.getPubStats()
    var danger1 = (stats.membersof === 0) ? '.text-danger' : ''
    var danger2 = (stats.active === 0) ? '.text-danger' : ''
    pubStatusEl.innerHTML = ''
    pubStatusEl.appendChild(h('h3'+danger1, 'You\'re a member of ', stats.membersof,' pubs ', h('small'+danger2, stats.active, ' connected')))
    if (stats.membersof === 0)
      pubStatusEl.appendChild(h('p', com.icon('warning-sign'), ' You need to join a pub if you want to communicate across the Internet!'))
    else if (stats.active === 0)
      pubStatusEl.appendChild(h('p', com.icon('warning-sign'), ' None of your pubs are responding! Are you connected to the Internet?'))
    pubStatusEl.appendChild(h('p', h('a.btn.btn-3d', { href: '#', onclick: modals.invite }, com.icon('cloud'), ' Join a Pub')))
  }

  function updatepeer (peer) {
    for (var i=0; i < app.peers.length; i++) {
      if (app.peers[i].key == peer.key) {
        app.peers[i] = peer
        setpubstatus()
        return
      }
    }
  }

  function setlastconnect (el, peer) {
    var s
    if (peer.time) {
      if (peer.time.connect > peer.time.attempt)
        s = 'synced '+(new Date(peer.time.connect).toLocaleString())
      else if (peer.time.attempt) {
        s = 'attempted (but failed) to connect at '+(new Date(peer.time.attempt).toLocaleString())
      }
    }
    el.querySelector('.last-connect').innerText = s || ''
  }

  function setprogress (el, p, label) {
    el.querySelector('.progress-bar').style.width = p + '%'
    el.querySelector('.progress-bar span').innerText = label
    if (label)
      el.querySelector('.progress-bar').style.minWidth = '10%'
    else
      el.querySelector('.progress-bar').style.minWidth = '2%'
  }

  function renderPeer (peer) {
    function onsync (e) {
      e.preventDefault()
      app.ssb.gossip.connect({ host: peer.host, port: peer.port, key: peer.key }, function (){})
    }

    var el = h('.peer' + ((peer.connected)?'.connected':''), { 'data-id': peer.key },
      com.userHexagon(peer.key, 80),
      h('.details',
        h('h3',
            com.userName(peer.key),
            ' ', h('a.btn.btn-3d.btn-xs', { href: '#', onclick: onsync }, 'Sync'),
            h('br'), h('small', peer.host+':'+peer.port+':'+peer.key)
          ),
        h('.progress', h('.progress-bar.progress-bar-striped.active', h('span'))),
        h('p.last-connect')
      )
    )
    setprogress(el, peer, '')
    setlastconnect(el, peer)
    return el
  }
}
