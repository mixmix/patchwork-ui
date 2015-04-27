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

    // posts only
    if (c.type !== 'post')
      return false

    // filter out people not followed directly
    if (a !== app.user.id && (!myprofile.assignedTo[a] || !myprofile.assignedTo[a].following))
      return false

    return true
  }

  // markup

  var feed = com.messageFeed(app, { filter: filterFn, loadmore: true, infinite: true })
  app.setPage('home', h('.row',
    h('.col-xs-1'),
    h('.col-xs-7', feed),
    h('.col-xs-3.right-column',
      h('.right-column-inner', com.friendsHexagrid(app)),
      com.sidehelp(app)
    )
  ))
}
