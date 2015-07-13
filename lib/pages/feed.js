'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var pull = require('pull-stream')
var multicb = require('multicb')
var com = require('../com')

module.exports = function (app) {

  // markup

  app.setPage('feed', h('.layout-onecol',
    h('.layout-main',
      h('h3.text-center', 'Under the Hood'),
      com.messageFeed(app, { render: com.messageSummary.raw, infinite: true })
    )
  ))
}
