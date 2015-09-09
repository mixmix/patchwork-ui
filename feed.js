'use strict'
var pull   = require('pull-stream')
var ui      = require('./lib/ui')
var modals  = require('./lib/ui/modals')
var o       = require('observable')
var multicb = require('multicb')
// var emojis  = require('emoji-named-characters')
require('./css/feed.css')

// Base HTML
document.body.innerHTML = [
'<!DOCTYPE html>',
'<html>',
'  <head>',
'    <title>-=[ Patchwork ]=-</title>',
'    <meta charset="utf-8">',
'  </head>',
'  <body>',
'    <div id="app-status"></div>',
'    <div id="app-notices"></div>',
'    <div id="please-wait">',
'      <div class="spinner">',
'        <div class="cube1"></div>',
'        <div class="cube2"></div>',
'      </div>',
'    </div>',
'    <div id="page-nav"></div>',
'    <div id="page-container"></div>',
'  </body>',
'</html>'
].join('')

// Init
// ====

// master state object
var app =
window.app = require('./lib/app')
app.mixin({
  // sbot rpc connection
  ssb: ssb,

  // pull state from sbot, called on every pageload
  fetchLatestState: fetchLatestState,

  // pages in our app
  pages: {
    home:      require('./lib/pages/home'),  
    msg:       require('./lib/pages/message'),
    notfound:  require('./lib/pages').notfound,
    profile:   require('./lib/pages/profile'),
    setup:     require('./lib/pages/setup')
  },

  // page params parsed from the url
  page: {
    id: 'home',
    param: null,
    qs: {}
  },

  // ui data
  suggestOptions: { 
    /*':': Object.keys(emojis).map(function (emoji) {
      return {
        image: './img/emoji/' + emoji + '.png',
        title: emoji,
        subtitle: emoji,
        value: emoji + ':'
      }
    }),*/
    '@': []
  },
  homeMode: {
    view: 'all',
    live: true
  },
  filters: {
    nsfw: true,
    spam: true,
    abuse: true
  },

  // application state, fetched every refresh
  actionItems: {},
  indexCounts: {},
  user: {
    id: null,
    profile: {}
  },
  users: {
    names: {},
    profiles: {}
  },

  // global observables, updated by persistent events
  observ: {
    newPosts: o(0),
    indexCounts: {
      inbox: o(0),
      votes: o(0),
      follows: o(0),
      inboxUnread: o(0),
      votesUnread: o(0),
      followsUnread: o(0)
    }
  }
})

var firstFetch = true
function fetchLatestState (cb) {
  var done = multicb({ pluck: 1 })
  app.ssb.whoami(done())
  app.ssb.patchwork.getNamesById(done())
  app.ssb.patchwork.getAllProfiles(done())
  app.ssb.patchwork.getActionItems(done())
  app.ssb.patchwork.getIndexCounts(done())
  done(function (err, data) {
    if (err) throw err.message
    app.user.id        = data[0].id
    app.users.names    = data[1]
    app.users.profiles = data[2]
    app.actionItems    = data[3]
    app.indexCounts    = data[4]
    app.user.profile   = app.users.profiles[app.user.id]

    // update observables
    for (var k in app.indexCounts)
      if (app.observ.indexCounts[k])
        app.observ.indexCounts[k](app.indexCounts[k])

    // refresh suggest options for usernames
    app.suggestOptions['@'] = []
    for (var id in app.users.profiles) {
      if (id == app.user.profile.id || (app.user.profile.assignedTo[id] && app.user.profile.assignedTo[id].following)) {
        var name = app.users.names[id]
        app.suggestOptions['@'].push({
          id: id,
          cls: 'user',        
          title: name || id,
          image: require('./lib/com').profilePicUrl(id),
          subtitle: name || id,
          value: name || id.slice(1) // if using id, dont include the @ sigil
        })
      }
    }

    // do some first-load things
    if (firstFetch) {
      app.observ.newPosts(0) // trigger title render, so we get the correct name
      firstFetch = false
    }

    cb()
  })
}

// toplevel events
window.addEventListener('hashchange', ui.refreshPage)
window.addEventListener('error', onError)
document.body.addEventListener('click', onClick)
document.body.addEventListener('mouseover', onHover)
pull(app.ssb.blobs.changes(), pull.drain(onBlobDownloaded))
app.observ.newPosts(onNewPost)

// render
ui.refreshPage(null, ui.pleaseWait.bind(ui, false))

// Handlers
// ========

function onError (e) {
  e.preventDefault()
  console.error(e.error)
  modals.error('Unexpected Error', e.error, 'This was an unhandled exception.')
}

// look for link clicks which should trigger same-page refreshes
function onClick (e) {
  var el = e.target
  while (el) {
    if (el.tagName == 'A' && el.origin == window.location.origin && el.hash && el.hash == window.location.hash) {
      e.preventDefault()
      e.stopPropagation()
      ui.refreshPage()
      return
    }
    el = el.parentNode
  }
}
function onHover (e) {
  var el = e.target
  while (el) {
    if (el.tagName == 'A') {
      if (el.getAttribute('title')) {
        ui.setStatus(el.getAttribute('title'))
      } else if (el.href) {
        var i = el.href.indexOf('#')
        if (i > 0)
          ui.setStatus(el.href.slice(i+1))
        else
          ui.setStatus(el.href)
      }
      return 
    }
    el = el.parentNode
  }
  ui.setStatus(false)
}

// render blobs as they come in
function onBlobDownloaded (hash) {
  // hash downloaded, update any images
  var els = document.querySelectorAll('img[src^="ssb:'+hash+'"]')
  for (var i=0; i < els.length; i++)
    els[i].src = 'ssb:'+hash
  var els = document.querySelectorAll('video[src^="ssb:'+hash+'"]')
  for (var i=0; i < els.length; i++)
    els[i].src = 'ssb:'+hash
  var els = document.querySelectorAll('[data-bg^="ssb:'+hash+'"]')
  for (var i=0; i < els.length; i++)
    els[i].style.backgroundImage = 'url(ssb:'+hash+')'
}


// update title to show when new messages are available
function onNewPost (n) {
  n = (n<0)?0:n
  var name = app.users.names[app.user.id] || 'New Account'
  if (n) {
    document.title = '-=[ ('+n+') Patchwork : '+name+' ]=-'
  } else {
    document.title = '-=[ Patchwork : '+name+' ]=-'
  }
}