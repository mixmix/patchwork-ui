'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var com = require('../com')

module.exports = function (app) {

  // track read messages :TODO: replace this
  // app.unreadMessages = 0
  // localStorage.readMessages = msgcount

  // markup
  
  /*if (msgs.length === 0) {
    // :TODO: restore this
    content = [
      h('p', h('strong', 'Your inbox is empty!')),
      h('p', 'When somebody @-mentions you or replies to your posts, you\'ll see their message here.')
    ]
  }*/
  var content = com.messageFeed(app, function (msg) {
    return mlib.getLinks(msg.value.content, { feed: app.myid }).length > 0
  })

  app.setPage('feed', h('.row',
    h('.col-xs-2.col-md-1', com.sidenav(app)),
    h('.col-xs-10.col-md-9', content),
    h('.hidden-xs.hidden-sm.col-md-2',
      com.adverts(app),
      h('hr'),
      com.sidehelp(app)
    )
  ))
}