'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var pull = require('pull-stream')
var multicb = require('multicb')
var com = require('../com')

module.exports = function (app) {

  // markup

  app.setPage('inbox', h('.row',
    h('.col-xs-1'),
    h('.col-xs-7', com.messageFeed(app, { feed: app.ssb.phoenix.createInboxStream, infinite: true })),
    h('.col-xs-3.right-column',
      h('.right-column-inner', com.friendsHexagrid(app, { size: 80 })),
      com.sidehelp(app)
    )
  ))
}
