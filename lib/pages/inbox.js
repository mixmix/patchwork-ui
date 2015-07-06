'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var pull = require('pull-stream')
var multicb = require('multicb')
var com = require('../com')

module.exports = function (app) {

  // markup

  app.setPage('inbox', h('.layout-onecol',
    h('.layout-main',
      h('h3.text-center', 'Your Inbox'),
      com.messageFeed(app, { render: com.messageOneline, feed: app.ssb.phoenix.createInboxStream, onempty: onempty, infinite: true }))
  ))

  function onempty (feedEl) {
    feedEl.appendChild(h('p.text-center', { style: 'margin: 25px 0; background: #fff; padding: 10px; color: gray' }, 'Your inbox is empty!'))
  }
}
