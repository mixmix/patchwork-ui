'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var pull = require('pull-stream')
var multicb = require('multicb')
var com = require('../com')

module.exports = function (app) {

  // markup

  function contactMsgs (opts) {
    opts = opts || {}
    opts.type = 'contact'
    return app.ssb.messagesByType(opts)
  }

  function contactCursor (msg) {
    // console.log(msg.value.timestamp, msg)
    if (msg)
      return msg.value.timestamp
  }

  var p = app.user.profile
  function contactFilter (m) {
    var a = m.value.author, c = m.value.content
    // only show contact-msgs by people I follow
    if (a !== p.id && (!p.assignedTo[a] || !p.assignedTo[a].following))
      return false
    // only show if it's interesting
    if (c.following || 'trust' in c)
      return true
    return false
  }

  app.setPage('home', h('.layout-twocol',
    h('.layout-main', 
      com.welcomehelp(app),
      com.notifications(app),
      com.composer.header(app, { placeholder: 'Share with the world...' }),
      com.messageFeed(app, { feed: app.ssb.phoenix.createHomeStream, infinite: true })),
    h('.layout-rightnav',
      com.sidehelp(app),
      com.messageFeed(app, { render: com.messageSummary, feed: contactMsgs, cursor: contactCursor, filter: contactFilter })
    )
  ))
}
