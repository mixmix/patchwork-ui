'use strict'
var h = require('hyperscript')
var o = require('observable')
var mlib = require('ssb-msgs')
var pull = require('pull-stream')
var app = require('../app')
var ui = require('../ui')
var com = require('../com')
var notifications = require('../com/notifications')
var postForm = require('../com/post-form')
var message = require('../com/message')
var messageFeed = require('../com/message-feed')
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

  function render (msg) {
    return message(msg, { markread: true })
  }
  function notification (vo, href, title, icon) {
    return o.transform(vo, function (v) {
      var cls = (v>0) ? '.highlight' : ''
      return h('a'+cls, { href: href, title: title }, com.icon(icon), ' ', v)
    })
  }
  ui.setPage('home', h('.layout-twocol',
    h('.layout-main', 
      notifications(),
      postForm(null, null, { noheader: true }),
      messageFeed({ feed: app.ssb.patchwork.createHomeStream, render: render, onempty: onempty, filter: homeFilter, limit: 100, infinite: true, live: hlf })
    ),
    h('.layout-rightnav',
      com.friendsHexagrid({ size: 80 })
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
