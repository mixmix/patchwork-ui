'use strict'
var h = require('hyperscript')
var multicb = require('multicb')
var com = require('../com')
var u = require('../lib/util')

module.exports = function (app) {
  var queryStr = app.page.qs.q || ''
  var currentList = app.page.qs.list || 'sync'
  
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

      if (currentList == 'following') {
        if ((id === app.user.id || (follows[app.user.id][id] && trusts[app.user.id][id] !== -1)))
          return true
      }
      else if (currentList == 'others') {
        if (id !== app.user.id && !follows[app.user.id][id] && !trusts[app.user.id][id])
          return true
      }
      else if (currentList == 'flagged') {
        if (id !== app.user.id && trusts[app.user.id][id] === -1)
          return true
      }

      return false
    }

    var content, teardown
    if (currentList == 'sync') {
      content = h('div')
      drawSyncList()

      // :HACK:
      // this view needs to show sync progress
      // would prefer something much cleaner than this!!!
      var redrawInterval = setInterval(drawSyncList, 5e3)
      teardown = function () { clearInterval(redrawInterval); console.log('TEARDOWN!')}
      function drawSyncList () {
        var done = multicb({ pluck: 1 })
        app.ssb.friends.all('follow', done())
        app.ssb.gossip.peers(done())
        app.ssb.phoenix.getNamesById(done())
        app.ssb.phoenix.getNameTrustRanks(done())
        app.ssb.phoenix.getAllProfiles(done())
        done(function (err, data) {
          var follows  = data[0]
          var peers    = data[1]
          app.users.names = data[2]
          app.users.nameTrustRanks = data[3]
          app.users.profiles = data[4]
          follows[app.user.id] = follows[app.user.id] || {}
          content.innerHTML = ''
          content.appendChild(com.contactSyncListing(app, peers, follows))
        })
      }
    } else {
      content = com.contactFeed(app, { filter: filterFn, follows: follows })
    }

    app.setPage('address-book', h('.row',
      h('.col-xs-2'),
      h('.col-xs-5',
        h('.header-ctrls',
          com.nav({
            current: currentList,
            items: [
              ['sync',      makeUri({ list: 'sync' }),      'Sync'],
              ['following', makeUri({ list: 'following' }), 'Following'],
              ['others',    makeUri({ list: 'others' }),    'Others'],
              ['flagged',   makeUri({ list: 'flagged' }),   'Flagged']
            ]
          }),
          ((currentList !== 'sync') ? com.search({
            value: queryStr,
            onsearch: onsearch
          }) : '')),
        content),
      h('.col-xs-4.right-column',
        h('.right-column-inner',
          h('table.table.peers',
            h('thead', h('tr', h('th', 'Gossip Network'))),
            h('tbody', com.peers(app, peers))
          )
        ))
    ), { onPageTeardown: teardown })

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
