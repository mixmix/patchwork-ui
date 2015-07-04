'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var pull = require('pull-stream')
var multicb = require('multicb')
var com = require('../com')

module.exports = function (app) {

  // markup

  var p = app.user.profile

  function homeFilter (m) {
    if (!app.page.qs.friends)
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

  app.setPage('home', [
    com.welcomehelp(app),
    h('.layout-twocol',
      h('.layout-main', 
        com.notifications(app),
        com.composer.header(app, { placeholder: 'Share with the world...' }),
        com.messageFeed(app, { feed: app.ssb.phoenix.createHomeStream, filter: homeFilter, infinite: true })),
      h('.layout-rightnav',
        com.sidehelp(app),
        com.messageFeed(app, { render: com.messageSummary, feed: contactFeed, cursor: contactCursor, filter: contactFilter })
      )
    )
  ])
}
