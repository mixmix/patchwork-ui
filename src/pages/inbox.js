'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var pull = require('pull-stream')
var multicb = require('multicb')
var com = require('../com')

module.exports = function (app) {

  var feedFn = app.ssb.phoenix.createInboxStream

  // markup

  var feed = com.messageFeed(app, { feed: feedFn, infinite: true })
  app.setPage('inbox', h('.row',
    h('.col-xs-1'),
    h('.col-xs-7', feed),
    h('.col-xs-3.right-column',
      h('.right-column-inner', com.friendsHexagrid(app)),
      com.sidehelp(app)
    )
  ))
}
