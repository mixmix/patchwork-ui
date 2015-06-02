'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var pull = require('pull-stream')
var multicb = require('multicb')
var com = require('../com')

module.exports = function (app) {

  var myprofile = app.users.profiles[app.user.id]
  function filterFn (msg) {
    var a = msg.value.author
    var c = msg.value.content

    // filter out people not followed directly
    if (a !== app.user.id && (!myprofile.assignedTo[a] || !myprofile.assignedTo[a].following))
      return false

    return true
  }

  // markup

  app.setPage('home', h('.layout-twocol',
    h('.layout-main', 
      com.welcomehelp(app),
      h('.header-ctrls', com.composer.header(app)), 
      com.messageFeed(app, { feed: app.ssb.phoenix.createHomeStream, filter: filterFn, loadmore: true, infinite: true })),
    h('.layout-sidenav',
      com.networkGraph(app, { drawLabels: false, touchEnabled: false, mouseEnabled: false, mouseWheelEnabled: false }),
      com.friendsHexagrid(app, { size: 80 }),
      com.sidehelp(app)
    )
  ))
}
