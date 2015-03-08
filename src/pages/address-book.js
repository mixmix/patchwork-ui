'use strict'
var h = require('hyperscript')
var multicb = require('multicb')
var com = require('../com')
var u = require('../lib/util')

module.exports = function (app) {
  var queryStr = app.page.qs.q || ''
  var currentList = app.page.qs.list || 'contacts'
  
  // fetch

  var done = multicb({ pluck: 1 })
  app.ssb.phoenix.getAllProfiles(done())
  app.ssb.friends.all('follow', done())
  app.ssb.friends.all('trust', done())
  app.ssb.gossip.peers(done())
  done(function (err, data) {
    var profiles = data[0]
    var follows  = data[1]
    var trusts   = data[2]
    follows[app.myid] = follows[app.myid] || {}
    trusts [app.myid] = trusts [app.myid] || {}

    // markup

    function listFn (opts) {
      opts.type = 'init'
      return app.ssb.messagesByType(opts)
    }
    function filterFn (msg) {
      var id = msg.value.author

      if (queryStr) {
        var author = app.names[msg.value.author] || msg.value.author
        var regex = new RegExp(queryStr.replace(/\s/g, '|'))
        if (!regex.exec(author))
          return false
      }

      if (currentList == 'contacts') {
        if (id === app.myid || (follows[app.myid][id] && trusts[app.myid][id] !== -1))
          return true
      }
      else if (currentList == 'others') {
        if (id !== app.myid && !follows[app.myid][id] && trusts[app.myid][id] !== -1)
          return true
      }
      else if (currentList == 'blocked') {
        if (id !== app.myid && trusts[app.myid][id] === -1)
          return true
      }

      return false
    }

    app.setPage('address-book', h('.row',
      h('.col-xs-2.col-md-1', com.sidenav(app)),
      h('.col-xs-10.col-md-8',
        h('.header-ctrls',
          com.search({
            value: queryStr,
            onsearch: onsearch
          }),
          com.nav({
            current: currentList,
            items: [
              ['contacts', makeUri({ list: 'contacts' }), 'Your Contacts'],
              ['others',   makeUri({ list: 'others' }),   'Others'],
              ['blocked',  makeUri({ list: 'blocked' }),  'Blocked']
            ]
          })),
        com.messageFeed(app, listFn, filterFn, com.address(app, profiles, follows))),
      h('.col-xs-10.col-xs-push-2.col-md-3.col-md-push-0',
        h('table.table.peers',
          h('thead', h('tr', h('th', 'Network'))),
          h('tbody', com.peers(app, data[3]))
        ),
        h('hr'),
        com.sidehelp(app))
    ))

    function makeUri (opts) {
      opts.q = ('q' in opts) ? opts.q : queryStr
      opts.v = ('list' in opts) ? opts.list : currentList
      return '#/address-book?q=' + encodeURIComponent(opts.q) + '&list=' + encodeURIComponent(opts.v)
    }

    // handlers

    function onsearch (e) {
      e.preventDefault()
      window.location.hash = makeUri({ q: e.target.search.value })
    }

  })
}
