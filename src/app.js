'use strict'
var h          = require('hyperscript')
var multicb    = require('multicb')
var router     = require('phoenix-router')
var pull       = require('pull-stream')
var schemas    = require('ssb-msg-schemas')
var com        = require('./com')
var pages      = require('./pages')
var util       = require('./lib/util')

module.exports = function (ssb) {

  // master state object

  var app = {
    ssb: ssb,
    myid: null,
    names: null,
    nameTrustRanks: null,
    page: {
      id: 'feed',
      param: null
    },
    lastHubPage: '#/',
    pendingCount: 0,
    indexCounts: { inboxUnread: 0 },
    suggestOptions: require('./lib/suggest-options'),
  }

  // page behaviors

  window.addEventListener('hashchange', function() { app.refreshPage() })
  window.addEventListener('resize', resizeControls)
  document.body.addEventListener('click', onClick(app))

  // toplevel & common methods
  app.setupRpcConnection = setupRpcConnection.bind(app)
  app.refreshPage        = refreshPage.bind(app)
  app.updateCounts       = updateCounts.bind(app)
  app.getOtherNames      = getOtherNames.bind(app)
  app.showUserId         = showUserId.bind(app)
  app.setPendingCount    = setPendingCount.bind(app)
  app.setInboxUnreadCount= setInboxUnreadCount.bind(app)
  app.setStatus          = setStatus.bind(app)
  app.followPrompt       = followPrompt.bind(app)
  app.setNamePrompt      = setNamePrompt.bind(app)
  app.setPage            = setPage.bind(app)
  app.pollPeers          = pollPeers.bind(app)

  // periodically poll and rerender the current connections
  setInterval(app.pollPeers, 5000)

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
  var route = router('#'+location.href.split('#')[1]||'', 'posts')
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
  done(function (err, data) {
    if (err) throw err.message
    app.myid = data[0].id
    app.names = data[1]
    app.nameTrustRanks = data[2]
    app.indexCounts = data[4]
    var profiles = data[3]

    // refresh suggest options for usernames
    app.suggestOptions['@'] = []
    for (var k in profiles) {
      var name = app.names[k] || k
      app.suggestOptions['@'].push({ title: name, subtitle: app.getOtherNames(profiles[k]) + ' ' + util.shortString(k), value: name })
    }

    // re-route to setup if needed
    /*if (!app.names[app.myid]) {
      if (window.location.hash != '#/setup') {      
        window.location.hash = '#/setup'
        return
      }
    } else if (window.location.hash == '#/setup') {
      window.location.hash = '#/'
      return
    }*/

    // render the page
    h.cleanup()    
    var page = pages[app.page.id]
    if (!page)
      page = pages.notfound
    if (page.isHubPage)
      app.lastHubPage = window.location.hash
    page(app)
  })
}

function updateCounts () {
  var this_ = this
  this_.ssb.phoenix.getIndexCounts(function (err, counts) {
    this_.setInboxUnreadCount(counts.inboxUnread)
  })
}

function getOtherNames (profile) {
  // todo - replace with ranked names
  var name = this.names[profile.id] || profile.id

  var names = []
  function add(n) {
    if (n && n !== name && !~names.indexOf(n))
      names.push(n)
  }

  // get 3 of the given or self-assigned names
  add(profile.self.name)
  for (var k in profile.assignedBy) {
    if (names.length >= 3)
      break
    add(profile.assignedBy[k].name)
  }
  return names
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
    document.querySelector('.side-nav .side-nav-inbox a').textContent = 'inbox ('+n+')'
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
  else schemas.addFollow(app.ssb, id, next)
    
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

    if (isSelf)
      schemas.addOwnName(app.ssb, name, done)
    else
      schemas.addOtherName(app.ssb, userId, name, done)

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