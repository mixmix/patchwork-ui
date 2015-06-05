'use strict'
var h = require('hyperscript')
var multicb = require('multicb')
var com = require('../com')
var u = require('../lib/util')

module.exports = function (app) {
  var queryStr = app.page.qs.q || ''
  var currentList = app.page.qs.list || 'following'
  
  // fetch

  var done = multicb({ pluck: 1 })
  app.ssb.friends.all('follow', done())
  app.ssb.friends.all('trust', done())
  app.ssb.gossip.peers(done())
  done(function (err, data) {
    var follows  = data[0]
    var trusts   = data[1]
    var peers    = data[2]
    follows[app.user.id] = follows[app.user.id] || {}
    trusts [app.user.id] = trusts [app.user.id] || {}

    // markup

    function filterFn (prof) {
      var id = prof.id

      if (queryStr) {
        var author = app.users.names[id] || id
        var regex = new RegExp(queryStr.replace(/\s/g, '|'))
        if (!regex.exec(author))
          return false
      }

      if (id == app.user.id) // self
        return true

      if (app.users.profiles[id] && app.users.profiles[id].self.name) // has a name
        return true

      return false
    }

    app.setPage('address-book', h('.layout-twocol',
      h('.layout-main', com.contactFeed(app, { filter: filterFn, follows: follows })),
      h('.layout-sidenav',
        h('table.table.peers',
          h('thead', h('tr', h('th', 'Gossip Network'))),
          h('tbody', com.peers(app, peers))
        ),
        com.sidehelp(app))
    ))

    function makeUri (opts) {
      opts.q    = ('q' in opts) ? opts.q : queryStr
      opts.list = ('list' in opts) ? opts.list : currentList
      return '#/address-book?q=' + encodeURIComponent(opts.q) + '&list=' + encodeURIComponent(opts.list)
    }

    // handlers

    function onsearch (e) {
      e.preventDefault()
      window.location.hash = makeUri({ q: e.target.search.value })
    }

  })
}
