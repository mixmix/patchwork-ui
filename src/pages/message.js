'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var com = require('../com')
var util = require('../lib/util')

module.exports = function (app) {
  app.ssb.get(app.page.param, function (err, msg) {
    var content
    if (msg) {
      msg = { key: app.page.param, value: msg }
      content = com.message(app, msg, { fullview: true })
    } else {
      content = 'Message not found.'
    }

    app.setPage('message', h('.layout-onecol',
      h('.layout-main', content)
    ))
  })
}

