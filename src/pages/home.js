'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var pull = require('pull-stream')
var multicb = require('multicb')
var com = require('../com')

module.exports = function (app) {

  // markup

  function followMsgs (opts) {
    opts = opts || {}
    opts.type = 'contact'
    return app.ssb.messagesByType(opts)
  }

  app.setPage('home', h('.layout-twocol',
    h('.layout-main', 
      com.welcomehelp(app),
      com.messageFeed(app, { feed: app.ssb.phoenix.createHomeStream, loadmore: true, infinite: true })),
    h('.layout-rightnav',
      com.sidenav(app),
      com.sidehelp(app),
      com.messageFeed(app, { render: com.messageSummary, feed: followMsgs })
    )
  ))
}
