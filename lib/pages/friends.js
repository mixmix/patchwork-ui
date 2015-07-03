'use strict'
var h = require('hyperscript')
var com = require('../com')

module.exports = function (app) {

  // markup

  app.setPage('followers', h('.layout-onecol',
    h('.layout-main',
      h('h3.text-center', 'Following'),
      h('div', { style: 'width: 850px; margin: 0 auto' }, com.friendsHexagrid(app, { size: 80, nrow: 10 })),
      h('h3.text-center', 'New Followers'),
      com.messageFeed(app, { render: com.messageSummary, feed: app.ssb.phoenix.createFollowStream, markread: true, infinite: true })
    )
  ))
}
