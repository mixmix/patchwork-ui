'use strict'
var h         = require('hyperscript')
var multicb   = require('multicb')
var router    = require('phoenix-router')
var pull      = require('pull-stream')
var emojis    = require('emoji-named-characters')
var schemas   = require('ssb-msg-schemas')
var com       = require('./com')
var pages     = require('./pages')
var u         = require('./lib/util')
var appui     = require('./app-ui')

var newMessageCount = 0
module.exports = function (ssb) {

  // master state object

  var app = {
    ssb: ssb,
    page: {
      id: 'feed',
      param: null
    },
    ui: {
      suggestOptions: { ':': [], '@': [] },
      actionItems: null
    },
    user: {
      id: null,
      profile: null
    },
    users: {
      names: null,
      nameTrustRanks: null,
      profiles: null
    }
  }

  // data structures

  // options for the suggest box
  for (var emoji in emojis) {
    app.ui.suggestOptions[':'].push({
      image: '/img/emoji/' + emoji + '.png',
      title: emoji,
      subtitle: emoji,
      value: emoji + ':'
    })
  }

  // page behaviors

  // events
  window.addEventListener('hashchange', function() { app.refreshPage() })
  window.addEventListener('resize', resizeControls)
  document.body.addEventListener('click', onClick(app))

  // toplevel & common methods
  app.setupRpcConnection = setupRpcConnection.bind(app)
  app.refreshPage        = refreshPage.bind(app)
  app.setPage            = setPage.bind(app)

  // common ui methods
  for (var m in appui) {
    app.ui[m] = appui[m].bind(app)
  }

  // periodically poll and rerender the current connections
  setInterval(pollPeers.bind(app), 5000)

  // plugins
  u.getJson('/plugins.json', function (err, plugins) {
    if (err) {
      console.error('Failed to load plugins')
      console.error(err)
      if (plugins)
        console.error(plugins)
      return
    }
    for (var k in plugins.files) {
      try {
        console.log('Executing plugin', k)
        eval('(function() {\n"use strict"\n\n'+plugins.files[k]+'\n\n})()')
      } catch (e) {
        console.error(e)
      }
    }
  })

  return app
}

function resizeControls() {
  function rc (sel) {
    var els = document.querySelectorAll(sel)
    for (var i=0; i < els.length; i++)
      els[i].style.height = (window.innerHeight - els[i].offsetTop) + 'px'
  }
  try { rc('.full-height') } catch (e) {}
}

function onClick (app) {
  return function (e) {
    // look for link clicks which should trigger same-page refreshes
    var el = e.target
    while (el) {
      if (el.tagName == 'A' && el.origin == window.location.origin && el.hash && el.hash == window.location.hash)
        return e.preventDefault(), e.stopPropagation(), app.refreshPage()
      el = el.parentNode
    }
  }
}

function pollPeers () {
  var app = this
  var peersTables = Array.prototype.slice.call(document.querySelectorAll('table.peers tbody'))
  if (!peersTables.length)
    return // only update if peers are in the ui
  app.ssb.gossip.peers(function (err, peers) {
    if (err)
      return
    peersTables.forEach(function (tb) {  
      tb.innerHTML = ''
      com.peers(app, peers).forEach(function (row) {
        tb.appendChild(row)
      })
    })
  })
}

// should be called each time the rpc connection is (re)established
function setupRpcConnection () {
  var app = this
  pull(app.ssb.phoenix.createEventStream(), pull.drain(function (event) {
    if (event.type == 'message')
      setNewMessageCount(newMessageCount + 1)
  }))
}

function refreshPage (e) {
  var app = this
  e && e.preventDefault()

  // clear pending messages
  setNewMessageCount(0)

  // run the router
  var route = router('#'+(location.href.split('#')[1]||''), 'feed')
  app.page.id    = route[0]
  app.page.param = route[1]
  app.page.qs    = route[2] || {}

  // collect common data
  var done = multicb({ pluck: 1 })
  app.ssb.whoami(done())
  app.ssb.phoenix.getNamesById(done())
  app.ssb.phoenix.getNameTrustRanks(done())
  app.ssb.phoenix.getAllProfiles(done())
  app.ssb.phoenix.getActionItems(done())
  done(function (err, data) {
    if (err) throw err.message
    app.user.id = data[0].id
    app.users.names = data[1]
    app.users.nameTrustRanks = data[2]
    app.users.profiles = data[3]
    app.ui.actionItems = data[4]
    app.user.profile = app.users.profiles[app.user.id]

    // refresh suggest options for usernames
    app.ui.suggestOptions['@'] = []
    for (var k in app.users.profiles) {
      var name = app.users.names[k] || k
      app.ui.suggestOptions['@'].push({ title: name, subtitle: u.getOtherNames(app, app.users.profiles[k]) + ' ' + u.shortString(k), value: name })
    }

    // re-route to setup if needed
    if (!app.users.names[app.user.id]) {
      if (window.location.hash != '#/setup') {      
        window.location.hash = '#/setup'
        return
      }
    } else if (window.location.hash == '#/setup') {
      window.location.hash = '#/'
      return
    }

    // render the page
    h.cleanup()    
    var page = pages[app.page.id]
    if (!page)
      page = pages.notfound
    page(app)
  })
}

function setNewMessageCount (n) {
  newMessageCount = n
  try {
    if (n) {
      document.title = '('+n+') secure scuttlebutt'
    }
    else {
      document.title = 'secure scuttlebutt'
    }
  } catch (e) {}
}

function setPage (name, page, opts) {
  var el = document.getElementById('page-container')
  el.innerHTML = ''
  if (!opts || !opts.noHeader)
    el.appendChild(com.page(this, name, page))
  else
    el.appendChild(h('#page.container-fluid.'+name+'-page', page))
  resizeControls()
}