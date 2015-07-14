'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var app = require('../app')
var ui = require('../ui')
var com = require('../com')
var util = require('../util')

module.exports = function () {
  app.ssb.get(app.page.param, function (err, msg) {
    var content
    if (msg) {
      msg = { key: app.page.param, value: msg }
      content = com.message(msg, { markread: true, fullview: true })
    } else {
      content = 'Message not found.'
    }

    ui.setPage('message', h('.layout-onecol',
      h('.layout-main', content)
    ))
  })
}

