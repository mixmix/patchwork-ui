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
      var primary = (prof && prof.primary) ? prof.primary : false

      if (queryStr) {
        var author = app.users.names[id] || id
        var regex = new RegExp(queryStr.replace(/\s/g, '|'))
        if (!regex.exec(author))
          return false
      }

      if (currentList == 'following') {
        if ((id === app.user.id || (follows[app.user.id][id] && trusts[app.user.id][id] !== -1)) && !primary)
          return true
      }
      else if (currentList == 'others') {
        if (id !== app.user.id && !follows[app.user.id][id] && !trusts[app.user.id][id] && !primary)
          return true
      }
      else if (currentList == 'apps') {
        if (id !== app.user.id && primary === app.user.id)
          return true
      }
      else if (currentList == 'flagged') {
        if (id !== app.user.id && trusts[app.user.id][id] === -1)
          return true
      }

      return false
    }

    app.setPage('address-book', h('.row',
      h('.col-xs-1', com.sidenav(app)),
      h('.col-xs-8',
        h('.header-ctrls',
          com.nav({
            current: currentList,
            items: [
              ['following', makeUri({ list: 'following' }), 'Following'],
              ['others',    makeUri({ list: 'others' }),    'Others'],
              ['apps',      makeUri({ list: 'apps' }),      'Applications'],
              ['flagged',   makeUri({ list: 'flagged' }),   'Flagged']
            ]
          }),
          com.search({
            value: queryStr,
            onsearch: onsearch
          })),
        com.contactFeed(app, { filter: filterFn, follows: follows })),
      h('.col-xs-3.right-column.full-height',
        h('.right-column-inner',
          com.notifications(app),
          h('table.table.peers',
            h('thead', h('tr', h('th', 'Gossip Network'))),
            h('tbody', com.peers(app, peers))
          )
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
