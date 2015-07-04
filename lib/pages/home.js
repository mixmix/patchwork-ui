'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var pull = require('pull-stream')
var multicb = require('multicb')
var com = require('../com')

module.exports = function (app) {

  var rc // replication changes stream

  // filters

  var p = app.user.profile

  function homeFilter (m) {
    if (app.ui.homeMode.view == 'party')
      return true
    var a = m.value.author
    return p.assignedTo[a] && p.assignedTo[a].following
  }

  function contactFeed (opts) {
    opts = opts || {}
    opts.type = 'contact'
    return app.ssb.messagesByType(opts)
  }

  function contactCursor (msg) {
    if (msg)
      return msg.ts
  }

  function contactFilter (m) {
    var a = m.value.author, c = m.value.content
    // only show contact-msgs by people I follow
    if (a !== p.id && (!p.assignedTo[a] || !p.assignedTo[a].following))
      return false
    // only show if it's interesting
    if (c.following || 'flagged' in c)
      return true
    return false
  }

  // markup

  var livemodeProgressBars = (app.ui.homeMode.live) ? h('.livemode-progress-bars') : undefined
  app.setPage('home', [
    com.welcomehelp(app),
    h('.layout-twocol',
      h('.layout-main', 
        com.notifications(app),
        com.composer.header(app, { placeholder: 'Share with the world...' }),
        livemodeProgressBars,
        com.messageFeed(app, { feed: app.ssb.phoenix.createHomeStream, filter: homeFilter, infinite: true })),
      h('.layout-rightnav',
        com.sidehelp(app),
        com.messageFeed(app, { render: com.messageSummary, feed: contactFeed, cursor: contactCursor, filter: contactFilter })
      )
    )
  ], { onPageTeardown: function () {
    // abort event streams
    rc && rc(true, function(){})
  }})

  // live-mode

  if (app.ui.homeMode.live) {
    rc = app.ssb.replicate.changes()
    pull(rc, pull.drain(function (e) {
      console.log(e)
      if (e.type == 'start')
        setprogress(e.peerid, 0)
      if (e.type == 'finish')
        setprogress(e.peerid, 100)
      if (e.type == 'progress')
        setprogress(e.peerid, Math.round(e.progress / e.total * 100))
    }))
    function setprogress (id, progress) {
      var el = livemodeProgressBars.querySelector('.progress[data-id="'+id+'"]')
      if (progress === 0 && !el) {
        el = h('.progress', { 'data-id': id }, h('.progress-bar.progress-bar-striped.active'))
        livemodeProgressBars.appendChild(el)
      }
      else if (progress === 100 && el) {
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
}
