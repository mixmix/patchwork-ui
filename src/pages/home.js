'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var pull = require('pull-stream')
var multicb = require('multicb')
var com = require('../com')

module.exports = function (app) {
  var currentList = app.page.qs.list || 'inbox'

  // markup

  var content
  if (currentList == 'compose') {
    content = com.composer(app)
  } else {
    var feedfn = app.ssb.phoenix.createHomeStream
    if (currentList == 'all')
      feedfn = app.ssb.createFeedStream
    content = com.messageFeed(app, { feed: feedfn, loadmore: true, infinite: true })
  }

  app.setPage('home', h('.layout-twocol',
    h('.layout-main', 
      com.welcomehelp(app),
      h('.header-ctrls', 
        com.nav({
          current: currentList,
          items: [
            ['inbox',   makeUri({ list: 'inbox' }),   'Inbox'],
            ['all',     makeUri({ list: 'all' }),     'All Activity'],
            ['compose', makeUri({ list: 'compose' }), 'Compose']
          ]
        })),
      content),
    h('.layout-sidenav',
      com.networkGraph(app, { drawLabels: false, touchEnabled: false, mouseEnabled: false, mouseWheelEnabled: false }),
      com.friendsHexagrid(app, { size: 80 }),
      com.sidehelp(app)
    )
  ))


  function makeUri (opts) {
    opts.list = ('list' in opts) ? opts.list : currentList
    return '#/home?list=' + encodeURIComponent(opts.list)
  }
}
