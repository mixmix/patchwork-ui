'use strict'
var h = require('hyperscript')
var multicb = require('multicb')
var com = require('../com')
var u = require('../lib/util')

module.exports = function (app) {
  var queryStr = app.page.qs.q || ''
  var currentList = app.page.qs.list || 'following'

  // markup

  function filterFn (msg) {
    if (queryStr) {
      // :TODO:
      return false
    }

    return true
  }

  app.setPage('programs', h('.row',
    h('.col-xs-1', com.sidenav(app)),
    h('.col-xs-8',
      h('.header-ctrls',
        com.search({
          value: queryStr,
          onsearch: onsearch
        }),
        h('a.btn.btn-primary', {onclick: alert.bind(window, 'TODO'), style: 'margin-left: 5px'}, 'New Program')),
      com.programFeed(app, { filter: filterFn })),
    h('.col-xs-3.right-column.full-height',
      h('.right-column-inner',
        com.notifications(app)
      ),
      com.sidehelp(app))
  ))

  function makeUri (opts) {
    opts.q = ('q' in opts) ? opts.q : queryStr
    return '#/programs?q=' + encodeURIComponent(opts.q)
  }

  // handlers

  function onsearch (e) {
    e.preventDefault()
    window.location.hash = makeUri({ q: e.target.search.value })
  }
}
