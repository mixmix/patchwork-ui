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

  var p = app.user.profile
  function contactFilter (m) {
    var a = m.value.author
    // only show contact-msgs by people I follow
    if (p.assignedTo[a] && p.assignedTo[a].following)
      return true
    return false
  }

  app.setPage('home', h('.layout-twocol',
    h('.layout-main', 
      com.welcomehelp(app),
      com.messageFeed(app, { feed: app.ssb.phoenix.createHomeStream, loadmore: true, infinite: true })),
    h('.layout-rightnav',
      com.sidenav(app),
      com.sidehelp(app),
      com.messageFeed(app, { render: com.messageSummary, feed: contactMsgs, filter: contactFilter })
    )
  ))
}
