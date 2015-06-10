'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var pull = require('pull-stream')
var multicb = require('multicb')
var com = require('../com')

module.exports = function (app) {

  // markup

  app.setPage('inbox', h('.layout-twocol',
    h('.layout-main', 
      com.welcomehelp(app),
      com.messageFeed(app, { render: com.messageSummary, feed: app.ssb.phoenix.createInboxStream, markread: true, infinite: true })),
    h('.layout-rightnav',
      com.networkGraph(app, { drawLabels: false, touchEnabled: false, mouseEnabled: false, mouseWheelEnabled: false }),
      com.friendsHexagrid(app, { size: 80 }),
      com.sidehelp(app)
    )
  ))
}
