'use strict'
var auth       = require('ssb-domain-auth')
var h          = require('hyperscript')
var multicb    = require('multicb')
var pull       = require('pull-stream')
var SSBClient  = require('ssb-client')
var emojis     = require('emoji-named-characters')
var com        = require('./com')
var u          = require('./lib/util')

// RPC
// ===
var ssb = SSBClient()
ssb.connect()
var app = {
  ready: false,
  ssb: ssb,
  ui: {
    suggestOptions: { ':': [], '@': [] }
  },
  users: null,
  user: null
}
// emojis
for (var emoji in emojis) {
  app.ui.suggestOptions[':'].push({
    image: '/img/emoji/' + emoji + '.png',
    title: emoji,
    subtitle: emoji,
    value: emoji + ':'
  })
}

// rpc connection
ssb.on('connect', function() {
  // authenticate the connection
  auth.getToken(window.location.host, function(err, token) {
    if (err) return ssb.close(), console.error('Token fetch failed', err)
    ssb.auth(token, function(err) {
      setupRpcConnection()
    })
  })
})
ssb.on('close', function() { ssb.reconnect({ wait: 10e3 }) })

// called each time the rpc connection is (re)established
function setupRpcConnection () {
  /*pull(phoenix.ssb.phoenix.createEventStream(), pull.drain(function (event) {
    if (event.type == 'home-add')
      setNewMessageCount(getNewMessageCount() + 1)
    if (event.type == 'votes-add' || event.type == 'votes-remove' || event.type == 'follows-add' || event.type == 'follows-remove')
      renderNavDebounced()
  }))*/
  app.ready = true
  render(inbox)
}

// UI behavior
// ===========

Array.prototype.forEach.call(document.querySelectorAll('#nav > a'), function (el) {
  el.addEventListener('click', onNavClick)
})

function onNavClick (e) {
  e.preventDefault()
  if (!app.ready)
    return

  // update nav selection
  if (e.currentTarget.id !== 'nav-page') {
    document.querySelector('#nav .selected').classList.remove('selected')
    e.currentTarget.classList.add('selected')
  }

  // run logic
  switch (e.currentTarget.id) {
    case 'nav-inbox': return render(inbox)
    case 'nav-stars': return render(stars)
    case 'nav-follows': return render(follows)
    case 'nav-compose': return render(compose)
  }
}

function render (renderer) {
  // update app data
  var done = multicb({ pluck: 1 })
  app.ssb.whoami(done())
  app.ssb.phoenix.getNamesById(done())
  app.ssb.phoenix.getNameTrustRanks(done())
  app.ssb.phoenix.getAllProfiles(done())
  app.ssb.phoenix.getIndexCounts(done())
  done(function (err, data) {
    if (err) throw err.message
    app.users = {
      names: data[1],
      nameTrustRanks: data[2],
      profiles: data[3]
    }
    app.user = {
      id: data[0].id,
      profile: app.users.profiles[data[0].id]
    }

    // refresh suggest options for usernames
    var userProf = app.user.profile
    app.ui.suggestOptions['@'] = []
    for (var k in app.users.profiles) {
      if (k == userProf.id || (userProf.assignedTo[k] && userProf.assignedTo[k].following)) {
        var name = app.users.names[k] || k
        app.ui.suggestOptions['@'].push({
          id: k,
          cls: 'user',        
          title: name,
          image: com.profilePicUrl(app, k),
          subtitle: name,
          value: name
        })
      }
    }

    // render
    var contentEl = document.getElementById('content')
    contentEl.innerHTML = ''
    contentEl.appendChild(renderer())
  })
}

function inbox () {
  return com.messageFeed(app, { render: com.messageOneline, feed: ssb.phoenix.createInboxStream, infinite: true })
}

function stars () {
  return com.messageFeed(app, { render: com.messageSummary, feed: ssb.phoenix.createVoteStream, markread: true, infinite: true })
}

function follows () {
  return com.messageFeed(app, { render: com.messageSummary, feed: ssb.phoenix.createFollowStream, markread: true, infinite: true })
}

function compose () {
  return com.pmForm(app)
}