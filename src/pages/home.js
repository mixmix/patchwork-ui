'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var pull = require('pull-stream')
var multicb = require('multicb')
var com = require('../com')

module.exports = function (app) {

  // markup

  app.setPage('home', h('.layout-twocol',
    h('.layout-main', 
      com.welcomehelp(app),
      h('.header-ctrls', 
        com.nav({
          current: 'inbox',
          items: [
            ['compose', '/#/compose', 'compose',      '.pull-right.highlight'],
            ['inbox',   '/#/',        'Inbox'],
            ['feed',    '/#/feed',    'All Activity']
          ]
        })),
      com.messageFeed(app, { feed: app.ssb.phoenix.createHomeStream, loadmore: true, infinite: true })),
    h('.layout-sidenav',
      h('.header-ctrls', 
        com.nav({
          current: '',
          items: [
            ['help',         '/#/help',         'Help',         '.pull-right'],
            ['address-book', '/#/address-book', 'Address Book']
          ]
        })),
      com.networkGraph(app, { drawLabels: false, touchEnabled: false, mouseEnabled: false, mouseWheelEnabled: false }),
      com.friendsHexagrid(app, { size: 80 }),
      com.sidehelp(app)
    )
  ))
}
