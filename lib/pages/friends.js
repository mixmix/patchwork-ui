'use strict'
var h = require('hyperscript')
var com = require('../com')

module.exports = function (app) {

  // markup

  app.setPage('followers', h('.layout-onecol',
    h('.layout-main',
      com.welcomehelp(app),
      h('h3.text-center', 'Following'),
      com.friendsHexagrid(app, { size: 80, nrow: 10 }),
      h('h3.text-center', 'New Followers'),
      com.messageFeed(app, { render: com.messageSummary, feed: app.ssb.phoenix.createFollowStream, markread: true, infinite: true })
    )
  ))
}
