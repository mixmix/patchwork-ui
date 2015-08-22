'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var pull = require('pull-stream')
var app = require('../app')
var ui = require('../ui')
var com = require('../com')
var social = require('../social-graph')

module.exports = function () {

  var hlf // home live feed

  // filters

  var p = app.user.profile

  function homeFilter (m) {
    var a = m.value.author
    if (app.users.profiles[a] && app.users.profiles[a].flagged) // flagged by user
      return false
    if (app.homeMode.view == 'all')
      return true
    if (app.homeMode.view == 'friends')
      return a == app.user.id || social.follows(app.user.id, a)
    return social.follows(app.homeMode.view, a) // `view` is the id of a pub
  }

  // live-mode
  if (app.homeMode.live)
    hlf = app.ssb.patchwork.createHomeStream({ gt: [Date.now(), null], live: true })

  // markup

  var livemodeProgressBars = (app.homeMode.live) ? h('.livemode-progress-bars') : undefined
  function render (msg) {
    return com.message(msg, { markread: true })
  }
  ui.setPage('home', h('.layout-twocol',
    h('.layout-main', 
      com.notifications(),
      com.composer(null, null, { placeholder: 'Share a message with the world...' }),
      com.messageFeed({ feed: app.ssb.patchwork.createHomeStream, render: render, onempty: onempty, filter: homeFilter, limit: 100, infinite: true, live: hlf })
    ),
    h('.layout-rightnav',
      h('.shortcuts',
        h('.shortcuts-left',
          h('a', { href: '#/publisher', title: 'View your files and publish updates' }, 'Publisher')
        ),
        h('.shortcuts-right',
          h('a', { href: '#/inbox', title: 'Your inbox' }, com.icon('inbox'), ' ', app.observ.indexCounts.inboxUnread),
          h('a', { href: '#/stars', title: 'Stars on your posts, and stars by you' }, com.icon('star'), ' ', app.observ.indexCounts.votesUnread),
          h('a', { href: '#/friends', title: 'Friends, followers, and other users' }, com.icon('user'), ' ', app.observ.indexCounts.followsUnread)
        )
      ),
      com.notifications.side(),
      com.friendsHexagrid({ size: 80 }),
      com.help.side()
    )
  ), { onPageTeardown: function () {
    // abort streams
    hlf && hlf(true, function(){})
  }})

  function onempty (el) {
    if (app.homeMode.view == 'all')
      el.appendChild(com.help.welcome())
  }

}
