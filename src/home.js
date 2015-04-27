'use strict'
var muxrpc     = require('muxrpc')
var Serializer = require('pull-serializer')
var auth       = require('ssb-domain-auth')
var h          = require('hyperscript')
var multicb    = require('multicb')
var router     = require('phoenix-router')
var pull       = require('pull-stream')
var emojis     = require('emoji-named-characters')
var schemas    = require('ssb-msg-schemas')
var channel    = require('ssb-channel')
var com        = require('./com')
var pages      = require('./pages')
var u          = require('./lib/util')
var addUI      = require('./app-ui')

// program load
setup()
runPlugins()

// create the application object and register handlers
function setup() {
  // the SSB_MANIFEST variable is created by /manifest.js, which is loaded before the javascript bundle.
  var ssb = muxrpc(SSB_MANIFEST, false, function (stream) { return Serializer(stream, JSON, {split: '\n\n'}) })()
  var localhost = channel.connect(ssb, window.location.host)

  // master state object
  window.phoenix = {
    // sbot rpc connection
    ssb: ssb,

    // api
    refreshPage: refreshPage,
    setPage: setPage, // :TODO: make internal

    // component registry
    add: add,
    get: get,
    getAll: getAll,
    registry: {},

    // page params parsed from the url
    page: {
      id: 'home',
      param: null,
      qs: {}
    },

    // ui data
    ui: {
      emojis: [],
      suggestOptions: { ':': [], '@': [] },
      actionItems: null,
      indexCounts: {}
      // ui helper methods added by `addUi`
    },

    // userdata, fetched every refresh
    user: {
      id: null,
      profile: null
    },
    users: {
      names: null,
      nameTrustRanks: null,
      profiles: null,
      link: function (id) { return h('span', com.user(phoenix, id)) }
    },

    // for plugins
    h: require('hyperscript'),
    pull: require('pull-stream')
  }
  addUI(phoenix) // add ui methods

  // events
  window.addEventListener('hashchange', phoenix.refreshPage)
  window.addEventListener('resize', resizeControls)
  document.body.addEventListener('click', onClick)

  // periodically poll and rerender the current connections
  setInterval(pollPeers, 5000)

  // emojis
  for (var emoji in emojis) {
    phoenix.ui.emojis.push(emoji)
    phoenix.ui.suggestOptions[':'].push({
      image: '/img/emoji/' + emoji + '.png',
      title: emoji,
      subtitle: emoji,
      value: emoji + ':'
    })
  }

  // rpc connection
  localhost.on('connect', function() {
    // authenticate the connection
    auth.getToken(window.location.host, function(err, token) {
      if (err) return localhost.close(), console.error('Token fetch failed', err)
      ssb.auth(token, function(err) {
        phoenix.ui.setStatus(false)
        setupRpcConnection()
        phoenix.refreshPage()
      })
    })
  })
  localhost.on('error', function(err) {
    // inform user and attempt a reconnect
    console.log('Connection Error', err)
    phoenix.ui.setStatus('danger', 'Lost connection to the host program. Please restart the host program. Trying again in 10 seconds.')
    localhost.reconnect()
  })
  localhost.on('reconnecting', function(err) {
    console.log('Attempting Reconnect')
    phoenix.ui.setStatus('danger', 'Lost connection to the host program. Reconnecting...')
  })
}

// fetch plugins from sbot and eval them sequentially
function runPlugins() {
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
}

// find any controls with the 'full-height' class and expand them vertically to fill
function resizeControls() {
  function rc (sel) {
    var els = document.querySelectorAll(sel)
    for (var i=0; i < els.length; i++)
      els[i].style.height = (window.innerHeight - els[i].offsetTop) + 'px'
  }
  try { rc('.full-height') } catch (e) {}
}

// look for link clicks which should trigger same-page refreshes
function onClick (e) {
  var el = e.target
  while (el) {
    if (el.tagName == 'A' && el.origin == window.location.origin && el.hash && el.hash == window.location.hash)
      return e.preventDefault(), e.stopPropagation(), phoenix.refreshPage()
    el = el.parentNode
  }
}

// get peer status from sbot, update ui controls
function pollPeers () {
  var peersTables = Array.prototype.slice.call(document.querySelectorAll('table.peers tbody'))
  if (!peersTables.length)
    return // only update if peers are in the ui
  phoenix.ssb.gossip.peers(function (err, peers) {
    if (err)
      return
    peersTables.forEach(function (tb) {  
      tb.innerHTML = ''
      com.peers(phoenix, peers).forEach(function (row) {
        tb.appendChild(row)
      })
    })
  })
}

// should be called each time the rpc connection is (re)established
function setupRpcConnection () {
  pull(phoenix.ssb.phoenix.createEventStream(), pull.drain(function (event) {
    if (event.type == 'home-add')
      setNewMessageCount(getNewMessageCount() + 1)
    if (event.type == 'inbox-add')
      setInboxUnreadCount((phoenix.ui.indexCounts.inboxUnread||0) + 1)
    if (event.type == 'inbox-remove')
      setInboxUnreadCount((phoenix.ui.indexCounts.inboxUnread||0) - 1)
  }))
}

// re-renders the page
function refreshPage (e) {
  e && e.preventDefault()

  // clear pending messages
  setNewMessageCount(0)

  // run the router
  var route = router('#'+(location.href.split('#')[1]||''), 'home')
  phoenix.page.id    = route[0]
  phoenix.page.param = route[1]
  phoenix.page.qs    = route[2] || {}

  // collect common data
  var done = multicb({ pluck: 1 })
  phoenix.ssb.whoami(done())
  phoenix.ssb.phoenix.getNamesById(done())
  phoenix.ssb.phoenix.getNameTrustRanks(done())
  phoenix.ssb.phoenix.getAllProfiles(done())
  phoenix.ssb.phoenix.getActionItems(done())
  phoenix.ssb.phoenix.getIndexCounts(done())
  done(function (err, data) {
    if (err) throw err.message
    phoenix.user.id = data[0].id
    phoenix.users.names = data[1]
    phoenix.users.nameTrustRanks = data[2]
    phoenix.users.profiles = data[3]
    phoenix.ui.actionItems = data[4]
    phoenix.ui.indexCounts = data[5]
    phoenix.user.profile = phoenix.users.profiles[phoenix.user.id]

    // refresh suggest options for usernames
    phoenix.ui.suggestOptions['@'] = []
    for (var k in phoenix.users.profiles) {
      var name = phoenix.users.names[k] || k
      phoenix.ui.suggestOptions['@'].push({ title: name, subtitle: u.getOtherNames(phoenix, phoenix.users.profiles[k]) + ' ' + u.shortString(k), value: name })
    }

    // re-route to setup if needed
    if (!phoenix.users.names[phoenix.user.id]) {
      if (window.location.hash != '#/setup') {      
        window.location.hash = '#/setup'
        return
      }
    } else if (window.location.hash == '#/setup') {
      window.location.hash = '#/'
      return
    }

    // lookup the page
    var page = pages[phoenix.page.id]
    if (!page) {
      var pageCom = phoenix.get('page', { id: phoenix.page.id })
      if (pageCom)
        page = pageShell(pageCom)
    }

    // cleanup the old page
    h.cleanup()
    window.onscroll = null // commonly used for infinite scroll

    // render the page
    if (!page)
      page = pages.notfound
    page(phoenix)
  })
}

// add a component to the registry
function add (type, config, fn) {
  var r = phoenix.registry[type]
  if (!r) r = phoenix.registry[type] = []
  if (typeof config == 'function') {
    fn = config
    config = {}
  }
  config.id = r.length
  r.push({ config: config, fn: fn })
}

// get a component from the registry
function get (type, params) {
  params = params || {}
  var r = phoenix.registry[type] || []
  for (var i=0; i < r.length; i++) {
    if (registryTest(r[i], params))
      return r[i]
  }
  return null
}

// get components from the registry
function getAll (type, params) {
  var c = []
  params = params || {}
  var r = phoenix.registry[type] || []
  for (var i=0; i < r.length; i++) {
    if (registryTest(r[i], params))
      c.push(r[i])
  }
  return c
}

// helper for registry queries
function registryTest (item, params) {
  for (var k in params) {
    if (item.config[k] != params[k])
      return false
  }
  return true
}

// update ui to show new messages are available
var newMessageCount = 0
function getNewMessageCount () {
  return newMessageCount
}
function setNewMessageCount (n) {
  n = (n<0)?0:n
  newMessageCount = n
  if (n) {
    document.title = '('+n+') secure scuttlebutt'
    try { 
      var loadmore = document.querySelector('.load-more')
      loadmore.style.display = 'block'
      loadmore.innerText = loadmore.textContent = 'Load More ('+n+')'
    } catch (e) {}
  } else
    document.title = 'secure scuttlebutt'
}
function setInboxUnreadCount (n) {
  n = (n<0)?0:n
  phoenix.ui.indexCounts.inboxUnread = n
  try { document.querySelector('.pagenav-inbox .count').innerHTML = n }
  catch (e) {}
}

// provide a shell for pages from the registry
function pageShell (pagecom) {
  return function () {
    phoenix.setPage('plugin-page',
      h('.row',
        h('.col-xs-1', com.sidenav(phoenix)),
        h('.col-xs-11', pagecom.fn())))
  }
}

// render a new page
function setPage (name, page, opts) {
  // render nav
  var navEl = document.getElementById('page-nav')
  navEl.innerHTML = ''
  navEl.appendChild(com.pagenav(phoenix, name, page))

  // render page
  var pageEl = document.getElementById('page-container')
  pageEl.innerHTML = ''
  if (!opts || !opts.noHeader)
    pageEl.appendChild(com.page(phoenix, name, page))
  else
    pageEl.appendChild(h('#page.container-fluid.'+name+'-page', page))

  // resize any .full-height controls
  // :TODO: remove?
  resizeControls()
}

