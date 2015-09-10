'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var pull = require('pull-stream')
var multicb = require('multicb')
var app = require('../app')
var ui = require('../ui')
var com = require('../com')
var messageFeed = require('../com/message-feed')
var messageOneline = require('../com/message-oneline')
var social = require('../social-graph')
var subwindows = require('../ui/subwindows')

module.exports = function () {

  // markup

  ui.setPage('inbox', h('.layout-onecol',
    h('.layout-main',
      h('a.btn.btn-3d.pull-right', { onclick: function (e) { e.preventDefault(); subwindows.pm() } }, com.icon('envelope'), ' Secret Message'),
      h('h3', 'Inbox'),
      messageFeed({ render: messageOneline, feed: app.ssb.patchwork.createInboxStream, filter: filter, onempty: onempty, infinite: true })
    )
  ))

  function onempty (feedEl) {
    feedEl.appendChild(h('p.text-center', { style: 'margin: 25px 0; padding: 10px; color: gray' }, 'Your inbox is empty!'))
  }

  function filter (msg) {
    var a = msg.value.author
    return a == app.user.id || social.follows(app.user.id, a)
  }
}
