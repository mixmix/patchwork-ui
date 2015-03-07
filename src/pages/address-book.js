'use strict'
var h = require('hyperscript')
var multicb = require('multicb')
var com = require('../com')

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

      if (currentList == 'contacts') {
        if (id !== app.myid && (!follows[app.myid][id] || trusts[app.myid][id] === -1))
          return false
      }
      else if (currentList == 'others') {
        if (id === app.myid || follows[app.myid][id] || trusts[app.myid][id] === -1)
          return false
      }
      else if (currentList == 'blocked') {
        if (id === app.myid || trusts[app.myid][id] !== -1)
          return false
      }

      if (!queryStr)
        return true

      var author = app.names[msg.value.author] || msg.value.author
      var regex = new RegExp(queryStr.replace(/\s/g, '|'))
      return (regex.exec(author))
    }
    function renderFn (msg) {
      var id = msg.value.author
      var profile = profiles[id]
      var otherNames = app.getOtherNames(profile)
      function r (e) { rename(e, id) }
      function f (e) { follow(e, id) }
      function unf (e) { unfollow(e, id) }
      function b (e) { block(e, id) }
      function unb (e) { unblock(e, id) }

      var followbtn, renameBtn, blockBtn
      if (id === app.myid) {
        followbtn = h('span.text-muted', 'you!')
      } else {
        if (trusts[app.myid][id] === -1)
          blockBtn = h('button.btn.btn-primary.btn-xs', { title: 'Unblock', onclick: unb }, com.icon('ok'), ' Unblock')
        else
          blockBtn = h('button.btn.btn-primary.btn-xs', { title: 'Block', onclick: b }, com.icon('remove'), ' Block')
        if (!follows[app.myid][id])
          followbtn = h('button.btn.btn-primary.btn-xs', { title: 'Follow', onclick: f }, com.icon('plus'), ' Add Contact')
        else
          followbtn = h('button.btn.btn-primary.btn-xs', { title: 'Unfollow', onclick: unf }, com.icon('minus'), ' Remove Contact')
      }
      renameBtn = h('button.btn.btn-primary.btn-xs', { title: 'Rename', onclick: r }, com.icon('pencil'), ' Rename')

      return h('tr.address',
        h('td.profpic', h('img', {src: '/img/default-prof-pic.png' })),
        h('td.details',
          h('p.name', 
            h('strong', com.a('#/profile/'+id, app.names[id]||id), com.nameConfidence(id, app)),
            ' ', 
            (otherNames.length)
              ? h('small.text-muted', 'aka ', otherNames.join(', '))
              : ''),
          h('p', followbtn, ' ', renameBtn, ' ', blockBtn)))
    }
    var searchInput = h('input.search', { type: 'text', placeholder: 'Search', value: queryStr })
    var feed = com.messageFeed(app, listFn, filterFn, renderFn)
    
    function listsNav () {
      return [
        ['contacts', 'Your Contacts'],
        ['others',   'Others'],
        ['blocked',  'Blocked']
      ].map(function (item) {
        var cls = ''
        if (item[0] == currentList)
          cls = '.selected'
        return h('a'+cls, { href: '#/address-book'+makeQs({ list: item[0] }) }, item[1])
      })
    }

    app.setPage('address-book', h('.row',
      h('.col-xs-2.col-md-1', com.sidenav(app)),
      h('.col-xs-10.col-md-8',
        h('.address-book-ctrls',
          h('.lists', listsNav()),
          h('form', { onsubmit: onsearch }, searchInput)),
        feed),
      h('.col-xs-10.col-xs-push-2.col-md-3.col-md-push-0',
        h('table.table.peers',
          h('thead', h('tr', h('th', 'Network'))),
          h('tbody', com.peers(app, data[3]))
        ),
        h('hr'),
        com.sidehelp(app))
    ))

    function makeQs (opts) {
      opts.q = ('q' in opts) ? opts.q : queryStr
      opts.v = ('list' in opts) ? opts.list : currentList
      return '?q=' + encodeURIComponent(opts.q) + '&list=' + encodeURIComponent(opts.v)
    }

    // handlers

    function onsearch (e) {
      e.preventDefault()
      window.location.hash = '#/address-book'+makeQs({ q: searchInput.value })
    }

    function rename (e, pid) {
      e.preventDefault()
      app.setNamePrompt(pid)
    }

    function follow (e, pid) {
      e.preventDefault()
      if (!follows[app.myid][pid]) {
        app.updateContact(pid, { following: true }, function(err) {
          if (err) swal('Error While Publishing', err.message, 'error')
          else app.refreshPage()
        })
      }
    }

    function unfollow (e, pid) {
      e.preventDefault()
      if (follows[app.myid][pid]) {
        app.updateContact(pid, { following: false }, function(err) {
          if (err) swal('Error While Publishing', err.message, 'error')
          else app.refreshPage()
        })
      }
    }

    function block (e, pid) {
      e.preventDefault()
      if (trusts[app.myid][pid] !== -1) {
        app.updateContact(pid, { trust: -1 }, function(err) {
          if (err) swal('Error While Publishing', err.message, 'error')
          else app.refreshPage()
        })
      }
    }

    function unblock (e, pid) {
      e.preventDefault()
      if (trusts[app.myid][pid] === -1) {
        app.updateContact(pid, { trust: 0 }, function(err) {
          if (err) swal('Error While Publishing', err.message, 'error')
          else app.refreshPage()
        })
      }
    }

  })
}
