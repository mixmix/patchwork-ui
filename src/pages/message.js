'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var com = require('../com')
var util = require('../lib/util')

module.exports = function (app) {
  app.ssb.get(app.page.param, function (err, msg) {
    var content
    if (msg) {
      content = com.message(app, { key: app.page.param, value: msg })
    } else {
      content = 'Message not found.'
    }

    app.setPage('message', h('.layout-twocol',
      h('.layout-main', content),
      h('.layout-sidenav',
        com.networkGraph(app, { drawLabels: false, touchEnabled: false, mouseEnabled: false, mouseWheelEnabled: false }),
        com.friendsHexagrid(app, { size: 80 }),
        com.sidehelp(app)
      )
    ))
  })
}

