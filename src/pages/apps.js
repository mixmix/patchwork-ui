'use strict'
var h = require('hyperscript')
var multicb = require('multicb')
var com = require('../com')
var u = require('../lib/util')

module.exports = function (app) {
  var queryStr = app.page.qs.q || ''
  var currentList = app.page.qs.list || 'yours'
  
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
      var flagged = trusts[app.user.id][id] === -1

      if (!primary || flagged)
        return false

      if (currentList == 'yours') {
        if (primary != app.user.id)
          return false
      }
      else if (currentList == 'others') {
        if (primary == app.user.id)
          return false
      }

      if (queryStr) {
        var feedname = app.users.names[id] || id
        var primaryname = app.users.names[primary] || primary
        var regex = new RegExp(queryStr.replace(/\s/g, '|'))
        if (!regex.exec(feedname) && !regex.exec(primaryname))
          return false
      }

      return true
    }

    var emptyStr = (currentList == 'others') ?
      'Empty. Your friends have no apps.' :
      'Empty. You have no apps.'
    app.setPage('apps', h('.row',
      h('.col-xs-1', com.sidenav(app)),
      h('.col-xs-8',
        h('.header-ctrls',
          com.nav({
            current: currentList,
            items: [
              ['yours',  makeUri({ list: 'yours' }),  'Yours'],
              ['others', makeUri({ list: 'others' }), 'Others\'']
            ]
          }),
          com.search({
            value: queryStr,
            onsearch: onsearch
          })),
        com.contactFeed(app, { filter: filterFn, follows: follows, empty: emptyStr })),
      h('.col-xs-3.right-column.full-height',
        h('.right-column-inner',
          com.notifications(app),
          h('h4', 'About Apps'),
          h('p', 
            'Web sites can create new feeds for you. ',
            'They\'ll declare you as their primary "alias," meaning, "we represent the same person!"'),
          h('p',
            'You\'ll get a notification above here when that happens. ',
            'Click "Confirm" if you want the alias to exist.')),
        com.sidehelp(app))
    ))

    function makeUri (opts) {
      opts.q    = ('q' in opts) ? opts.q : queryStr
      opts.list = ('list' in opts) ? opts.list : currentList
      return '#/apps?q=' + encodeURIComponent(opts.q) + '&list=' + encodeURIComponent(opts.list)
    }

    // handlers

    function onsearch (e) {
      e.preventDefault()
      window.location.hash = makeUri({ q: e.target.search.value })
    }

  })
}
