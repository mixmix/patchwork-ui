'use strict'
var h = require('hyperscript')
var multicb = require('multicb')
var com = require('../com')
var u = require('../lib/util')

module.exports = function (app) {
  var queryStr = app.page.qs.q || ''
  
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

    var searchForm = h('form', { onsubmit: onsearch }, h('input.form-control', { name: 'search' }))
    var feedContainer = h('div', com.contactFeed(app, { filter: filterFn, follows: follows }))
    app.setPage('address-book', [
      h('.address-book-controls',
        h('.search', h('h4', com.icon('search'), ' Search your Network'), searchForm),
        h('.create-invite', { onclick: swal.bind(null, 'Not Yet Implemented', 'We\'re sorry! This feature hasn\'t been implemented yet. We\'re working hard to finish it!', 'error') },  h('h4', 'Invite a Friend'), h('p', 'Bring a new user into your network')),
        h('.use-invite', { onclick: app.ui.inviteModal },  h('h4', 'Accept Invitation'), h('p', 'Join a friend in their network'))),
      feedContainer
    ])

    // handlers

    function onsearch (e) {
      e.preventDefault()
      queryStr = searchForm.search.value
      feedContainer.innerHTML = ''
      if (queryStr) {
        feedContainer.appendChild(h('.contact-feed-container',
          h('p', { style: 'margin-left: 5px' },
            'Searching for "'+queryStr+'". ',
            h('a', { href: '#', onclick: unsearch }, com.icon('remove'), ' Clear Search'))))
      }
      feedContainer.appendChild(com.contactFeed(app, { filter: filterFn, follows: follows }))

      function unsearch (e) {
        searchForm.search.value = ''
        onsearch(e)
      }
    }

  })
}
