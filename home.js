'use strict'
var h          = require('hyperscript')
var multicb    = require('multicb')
var router     = require('phoenix-router')
var pull       = require('pull-stream')
var emojis     = require('emoji-named-characters')
var schemas    = require('ssb-msg-schemas')
// var SSBClient  = require('ssb-client')
var SSBClient  = require('./lib/muxrpc-ipc')
var com        = require('./lib/com')
var pages      = require('./lib/pages')
var u          = require('./lib/util')
var addUI      = require('./lib/ui')

// program load
setup()

// create the application object and register handlers
var _onPageTeardown, _hideNav = false
function setup() {
  // master state object
  window.phoenix = {
    // sbot rpc connection
    ssb: SSBClient(),

    // api
    refreshPage: refreshPage,
    setPage: setPage,

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
      indexCounts: {},
      homeMode: {
        view: 'party',
        live: false
      }
      // ui helper methods added by `addUi`
    },

    // userdata, fetched every refresh
    user: {
      id: null,
      profile: null
    },
    users: {
      names: null,
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

  // init
  setupRpcConnection()
  phoenix.refreshPage()
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
    if (-1 !== ['inbox-add', 'inbox-remove', 'votes-add', 'votes-remove', 'follows-add', 'follows-remove'].indexOf(event.type))
      renderNavDebounced()
  }))
  pull(phoenix.ssb.blobs.changes(), pull.drain(function (hash) {
    // hash downloaded, update any images
    var els = document.querySelectorAll('img[src^="blob:'+hash+'"]')
    for (var i=0; i < els.length; i++)
      els[i].src = 'blob:'+hash
    var els = document.querySelectorAll('[data-bg^="blob:'+hash+'"]')
    for (var i=0; i < els.length; i++)
      els[i].style.backgroundImage = 'url(blob:'+hash+')'
  }))
}

// re-renders the page
function refreshPage (e) {
  e && e.preventDefault()
  var starttime = Date.now()
  phoenix.ui.pleaseWait(true, 1000)

  // run the router
  var route = router('#'+(location.href.split('#')[1]||''), 'home')
  phoenix.page.id    = route[0]
  phoenix.page.param = route[1]
  phoenix.page.qs    = route[2] || {}

  // collect common data
  var done = multicb({ pluck: 1 })
  phoenix.ssb.whoami(done())
  phoenix.ssb.phoenix.getNamesById(done())
  phoenix.ssb.phoenix.getAllProfiles(done())
  phoenix.ssb.phoenix.getActionItems(done())
  phoenix.ssb.phoenix.getIndexCounts(done())
  done(function (err, data) {
    if (err) throw err.message
    phoenix.user.id = data[0].id
    phoenix.users.names = data[1]
    phoenix.users.profiles = data[2]
    phoenix.ui.actionItems = data[3]
    phoenix.ui.indexCounts = data[4]
    var userProf = phoenix.user.profile = phoenix.users.profiles[phoenix.user.id]

    // refresh suggest options for usernames
    phoenix.ui.suggestOptions['@'] = []
    for (var k in phoenix.users.profiles) {
      if (k == userProf.id || (userProf.assignedTo[k] && userProf.assignedTo[k].following)) {
        var name = phoenix.users.names[k] || k
        phoenix.ui.suggestOptions['@'].push({
          id: k,
          cls: 'user',        
          title: name,
          image: com.profilePicUrl(phoenix, k),
          subtitle: name,
          value: name
        })
      }
    }

    // re-route to setup if needed
    if (!phoenix.users.names[phoenix.user.id]) {
      _hideNav = true
      if (window.location.hash != '#/setup') {      
        window.location.hash = '#/setup'
        return
      }
    } else
      _hideNav = false

    // lookup the page
    var page = pages[phoenix.page.id]

    // cleanup the old page
    h.cleanup()
    window.onscroll = null // commonly used for infinite scroll
    _onPageTeardown && _onPageTeardown()
    _onPageTeardown = null

    // render the page
    if (!page)
      page = pages.notfound
    page(phoenix)

    // clear or re-render pending messages
    if (phoenix.page.id == 'home')
      setNewMessageCount(0)
    else
      setNewMessageCount(getNewMessageCount())

    // metrics!
    phoenix.ui.pleaseWait(false)
    console.debug('page loaded in', (Date.now() - starttime), 'ms')
  })
}

// update ui to show new messages are available
var newMessageCount = 0
function getNewMessageCount () {
  return newMessageCount
}
function setNewMessageCount (n) {
  n = (n<0)?0:n
  newMessageCount = n
  var name = phoenix.users.names[phoenix.user.id] || 'New Account'
  var homebtn = document.querySelector('#page-nav .home')
  try {
    if (n) {
      document.title = '-=[ ('+n+') Patchwork : '+name+' ]=-'
      homebtn.classList.add('has-unread')
      homebtn.querySelector('.unread').innerHTML = n
    } else {
      document.title = '-=[ Patchwork : '+name+' ]=-'
      homebtn.classList.remove('has-unread')
    }
  } catch (e) {
    // ignore
  }
}

function renderNav () {
  var navEl = document.getElementById('page-nav')    
  if (_hideNav) {
    navEl.style.display = 'none'
  } else {
    navEl.style.display = 'block'
    navEl.innerHTML = ''   
    navEl.appendChild(com.pagenav(phoenix))
  }
}
var renderNavDebounced = u.debounce(function () {
  phoenix.ssb.phoenix.getIndexCounts(function (err, counts) {
    if (counts)
      phoenix.ui.indexCounts = counts
    renderNav()
  })
}, 150)

// render a new page
function setPage (name, page, opts) {
  if (opts && opts.onPageTeardown)
    _onPageTeardown = opts.onPageTeardown

  // render nav
  renderNav()

  // render page
  var pageEl = document.getElementById('page-container')
  pageEl.innerHTML = ''
  if (!opts || !opts.noHeader)
    pageEl.appendChild(com.page(phoenix, name, page))
  else
    pageEl.appendChild(h('#page.'+name+'-page', page))

  // scroll to top
  if (window.scrollY > 100)
    window.scrollTo(0, 0)

  // resize any .full-height controls
  // :TODO: remove?
  resizeControls()
}

