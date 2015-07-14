'use strict'
var h = require('hyperscript')
var app = require('../app')
var ui = require('../ui')
var com = require('../com')

module.exports = function () {

  // markup

  ui.setPage('followers', h('.layout-onecol',
    h('.layout-main',
      h('h3.text-center', 'Following'),
      h('div', { style: 'width: 850px; margin: 0 auto' }, com.friendsHexagrid({ size: 80, nrow: 10 })),
      h('h3.text-center', 'New Followers'),
      com.messageFeed({ render: com.messageSummary, feed: app.ssb.phoenix.createFollowStream, markread: true, infinite: true })
    )
  ))
}
