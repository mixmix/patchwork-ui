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
  ui.setPage('home', h('.layout-onecol',
    h('.layout-main', 
      com.notifications(),
      com.notifications.side(),
      com.friendsHexagrid({ size: 275, uneven: true }),
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
