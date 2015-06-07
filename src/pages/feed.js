'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var pull = require('pull-stream')
var multicb = require('multicb')
var com = require('../com')

module.exports = function (app) {

  // markup

  app.setPage('feed', h('.layout-twocol',
    h('.layout-main',
      h('h3.text-muted', { style: 'max-width: 800px; margin: 10px auto 30px' }, com.icon('cog'), ' Under the Hood'),
      com.messageFeed(app, { render: com.messageSummary, infinite: true })),
    h('.layout-rightnav',
      h('table.table.peers',
        h('thead', h('tr', h('th', 'Gossip Network'))),
        h('tbody', h('tr', h('td', 'Loading...')))
      ),
      com.sidehelp(app)
    )
  ))
}
