'use strict'
var h = require('hyperscript')
var app = require('../app')
var ui = require('../ui')
var com = require('../com')

module.exports = function () {

  // markup

  ui.setPage('stars', h('.layout-onecol',
    h('.layout-main', 
      h('h3.text-center', 'Stars on Your Posts'),
      com.messageFeed({ render: com.messageSummary, feed: app.ssb.patchwork.createVoteStream, markread: true, onempty: onempty, infinite: true }))
  ))

  function onempty (feedEl) {
    feedEl.appendChild(h('p.text-center', { style: 'margin: 25px 0; padding: 10px; color: gray' }, 'No stars... yet!'))
  }
}
