'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var pull = require('pull-stream')
var multicb = require('multicb')
var com = require('../com')

module.exports = function (app) {

  // markup

  app.setPage('inbox', h('.layout-onecol',
    h('.layout-main',
      h('h3.text-center', 'Your Inbox'),
      com.welcomehelp(app),
      com.messageFeed(app, { render: com.messageOneline, feed: app.ssb.phoenix.createInboxStream, infinite: true }))
  ))
}
