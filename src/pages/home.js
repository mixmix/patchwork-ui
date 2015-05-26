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

    // posts and facts only
    if (c.type !== 'post' && c.type !== 'fact')
      return false

    // no replies
    if (c.repliesTo)
      return false

    // filter out people not followed directly
    if (a !== app.user.id && (!myprofile.assignedTo[a] || !myprofile.assignedTo[a].following))
      return false

    return true
  }

  // markup

  app.setPage('home', h('.row',
    h('.col-xs-1'),
    h('.col-xs-7', 
      com.welcomehelp(app),
      h('.header-ctrls', com.composer.header(app)), 
      com.messageFeed(app, { filter: filterFn, loadmore: true, infinite: true })),
    h('.col-xs-3.right-column',
      h('.right-column-inner', com.friendsHexagrid(app)),
      com.sidehelp(app)
    )
  ))
}
