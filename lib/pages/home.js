'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var pull = require('pull-stream')
var app = require('../app')
var ui = require('../ui')
var com = require('../com')
var social = require('../social-graph')

module.exports = function () {

  var rc // replication changes stream
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

  if (app.homeMode.live) {

    // live feeds
    hlf = app.ssb.patchwork.createHomeStream({ gt: [Date.now(), null], live: true })

    // progress bars
    rc = app.ssb.replicate.changes()
    pull(rc, pull.drain(function (e) {
      if (e.type == 'start')
        setprogress(e.peerid, 0)
      if (e.type == 'finish')
        setprogress(e.peerid, 100)
      if (e.type == 'progress')
        setprogress(e.peerid, Math.round(e.progress / e.total * 100))
    }))
    function setprogress (id, progress) {
      var el = livemodeProgressBars.querySelector('.progress[data-id="'+id+'"]')
      if (progress !== 100 && !el) {
        el = h('.progress', { 'data-id': id }, h('.progress-bar.progress-bar-striped.active'))
        livemodeProgressBars.appendChild(el)
      }
      if (progress === 100) {
        if (!el) return
        el.querySelector('.progress-bar').style.width = '100%'
        setTimeout(function () { // let it render at 100% first
          livemodeProgressBars.removeChild(el)
        }, 1e3)
      }
      else {
        el.querySelector('.progress-bar').style.width = progress + '%'
      }
    }
  }

  // markup

  var livemodeProgressBars = (app.homeMode.live) ? h('.livemode-progress-bars') : undefined
  ui.setPage('home', h('.layout-twocol',
    h('.layout-main', 
      com.notifications(),
      com.composer(null, null, { placeholder: 'Share a message with the world...', onpost: onpost }),
      livemodeProgressBars,
      com.messageFeed({ feed: app.ssb.patchwork.createHomeStream, onempty: onempty, filter: homeFilter, limit: 100, infinite: true, live: hlf })
    ),
    h('.layout-rightnav',
      com.notifications.side(),
      com.friendsHexagrid({ size: 80 }),
      com.help.side()
    )
  ), { onPageTeardown: function () {
    // abort streams
    rc && rc(true, function(){})
    hlf && hlf(true, function(){})
  }})

  function onempty (el) {
    if (app.homeMode.view == 'all')
      el.appendChild(com.help.welcome())
  }

  // handlers

  function onpost (msg) {
    var feed = document.querySelector('.layout-main .message-feed')
    var el = com.message(msg)
    if (feed && el)
      feed.insertBefore(el, feed.firstChild)
  }
}
