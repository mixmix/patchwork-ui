'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var pull = require('pull-stream')
var app = require('../app')
var ui = require('../ui')
var com = require('../com')
var social = require('../social-graph')

module.exports = function () {

  // markup

  ui.setPage('home', h('.layout-onecol',
    h('.layout-main',
      com.notifications(),
      com.composer(null, null, { placeholder: 'Share a message with the world...' }),
      h('br'),
      com.notifications.side(),
      com.help.side()
    )
  ))
}
