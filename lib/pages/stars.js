'use strict'
var h = require('hyperscript')
var com = require('../com')

module.exports = function (app) {

  // markup

  app.setPage('stars', h('.layout-onecol',
    h('.layout-main', 
      h('h3.text-center', 'Stars on Your Posts'),
      com.messageFeed(app, { render: com.messageSummary, feed: app.ssb.phoenix.createVoteStream, markread: true, infinite: true }))
  ))
}
