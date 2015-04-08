'use strict'
var h          = require('hyperscript')
var multicb    = require('multicb')
var router     = require('phoenix-router')
var pull       = require('pull-stream')
var schemas    = require('ssb-msg-schemas')
var com        = require('./com')
var pages      = require('./pages')
var u          = require('./lib/util')

module.exports = function (ssb) {

  // master state object

  var app = {
    ssb: ssb,
    myid: null,
    names: null,
    nameTrustRanks: null,
    profiles: null,
    actionItems: null,
    page: {
      id: 'feed',
      param: null
    },

    // :TODO: all of these need updating
    pendingCount: 0, // :TODO: make private
    indexCounts: { inboxUnread: 0 }, // :TODO: take off app
    suggestOptions: require('./lib/suggest-options') // :TODO: take off app
  }

  // page behaviors

  window.addEventListener('hashchange', function() { app.refreshPage() })
  window.addEventListener('resize', resizeControls)
  document.body.addEventListener('click', onClick(app))

  // toplevel & common methods
  app.setupRpcConnection = setupRpcConnection.bind(app)
  app.refreshPage        = refreshPage.bind(app)
  app.setPage            = setPage.bind(app)
  app.updateCounts       = updateCounts.bind(app)

  // :TODO: all of these need updating
  app.showUserId         = showUserId.bind(app) // :TODO: generalize
  app.setPendingCount    = setPendingCount.bind(app) // :TODO: generalize
  app.setInboxUnreadCount= setInboxUnreadCount.bind(app) // :TODO: take off app
  app.setStatus          = setStatus.bind(app) // :TODO: generalize
  app.followPrompt       = followPrompt.bind(app) // :TODO: generalize
  app.setNamePrompt      = setNamePrompt.bind(app) // :TODO: generalize
  app.pollPeers          = pollPeers.bind(app) // :TODO: make private

  // periodically poll and rerender the current connections
  setInterval(app.pollPeers, 5000)

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
      app.setPendingCount(app.pendingCount + 1)
    if (event.type == 'notification')
      app.setInboxUnreadCount(app.indexCounts.inboxUnread + 1)
  }))
}

function refreshPage (e) {
  var app = this
  e && e.preventDefault()

  // clear pending messages
  app.setPendingCount(0)

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
  app.ssb.phoenix.getIndexCounts(done())
  app.ssb.phoenix.getActionItems(done())
  done(function (err, data) {
    if (err) throw err.message
    app.myid = data[0].id
    app.names = data[1]
    app.nameTrustRanks = data[2]
    app.profiles = data[3]
    app.indexCounts = data[4]
    app.actionItems = data[5]

    // refresh suggest options for usernames
    app.suggestOptions['@'] = []
    for (var k in app.profiles) {
      var name = app.names[k] || k
      app.suggestOptions['@'].push({ title: name, subtitle: u.getOtherNames(app, app.profiles[k]) + ' ' + u.shortString(k), value: name })
    }

    // re-route to setup if needed
    if (!app.names[app.myid]) {
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

function updateCounts () {
  var this_ = this
  this_.ssb.phoenix.getIndexCounts(function (err, counts) {
    this_.setInboxUnreadCount(counts.inboxUnread)
  })
}

function showUserId () { 
  swal('Here is your contact id', this.myid)
}

function setPendingCount (n) {
  this.pendingCount = n
  try {
    if (n) {
      document.title = '('+n+') secure scuttlebutt'
      document.getElementById('get-latest').classList.remove('hidden')
      document.querySelector('#get-latest .btn').textContent = 'Get Latest ('+n+')'
    }
    else {
      document.title = 'secure scuttlebutt'
      document.getElementById('get-latest').classList.add('hidden')
      document.querySelector('#get-latest .btn').textContent = 'Get Latest'
    }
  } catch (e) {}
}

function setInboxUnreadCount (n) {
  this.indexCounts.inboxUnread = n
  try {
    document.querySelector('.navlinks .navlink-inbox').textContent = 'inbox ('+n+')'
  } catch (e) { }  
}

function setStatus (type, message) {
  var status = document.getElementById('app-status')
  status.innerHTML = ''
  if (type)
    status.appendChild(h('.alert.alert-'+type, message))
}

function followPrompt (e) {
  var app = this
  e.preventDefault()

  var id = prompt('Enter the contact id or invite code')
  if (!id)
    return

  // surrounded by quotes?
  // the scuttlebot cli ouputs invite codes with quotes, so this could happen
  if (id.charAt(0) == '"' && id.charAt(id.length - 1) == '"')
    id = id.slice(1, -1) // strip em

  var parts = id.split(',')
  var isInvite = (parts.length === 3)
  if (isInvite) {
    app.setStatus('info', 'Contacting server with invite code, this may take a few moments...')
    app.ssb.invite.addMe(id, next)
  }
  else
    schemas.addContact(app.ssb, id, { following: true }, next)
    
  function next (err) {
    app.setStatus(false)
    if (err) {
      console.error(err)
      if (isInvite)
        swal('Invite Code Failed', userFriendlyInviteError(err.stack || err.message), 'error')
      else
        swal('Error While Publishing', err.message, 'error')
    }
    else {
      if (isInvite)
        swal('Invite Code Accepted', 'You are now hosted by '+parts[0], 'success')
      else
        swal('Contact Added', 'You will now follow the messages published by your new contact.', 'success')
      app.refreshPage()
    }
  }

  function userFriendlyInviteError(msg) {
    if (~msg.indexOf('incorrect or expired') || ~msg.indexOf('has expired'))
      return 'Invite code is incorrect or expired. Make sure you copy/pasted it correctly. If you did, ask the pub-server owner for a new code and try again.'
    if (~msg.indexOf('invalid') || ~msg.indexOf('feed to follow is missing') || ~msg.indexOf('may not be used to follow another key'))
      return 'Invite code is malformed. Make sure you copy/pasted it correctly. If you did, ask the pub-server owner for a new code and try again.'
    if (~msg.indexOf('pub server did not have correct public key'))
      return 'The pub server did not identify itself correctly for the invite code. Ask the pub-server owner for a new code and try again.'
    if (~msg.indexOf('unexpected end of parent stream'))
      return 'Failed to connect to the pub server. Check your connection, make sure the pub server is online, and try again.'
    if (~msg.indexOf('already following'))
      return 'You are already followed by this pub server.'
    return 'Sorry, an unexpected error occurred. Please try again.'
  }
}

function setNamePrompt (userId) {
  var app = this
  app.ssb.whoami(function (err, user) {
    userId = userId || user.id
    var isSelf = user.id === userId
    
    var name = (isSelf) ?
      prompt('What would you like your nickname to be?') :
      prompt('What would you like their nickname to be?')
    if (!name)
      return

    if (!confirm('Set nickname to '+name+'?'))
      return

    schemas.addContact(this.ssb, userId, { name: name }, done)

    function done(err) {
      if (err) swal('Error While Publishing', err.message, 'error')
      else app.refreshPage()
    }
  })
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