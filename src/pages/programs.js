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
      com.programFeed(app, { filter: filterFn })),
    h('.col-xs-3.right-column.full-height',
      h('.right-column-inner',
        com.notifications(app),
        h('h4', 'Plugins Help'),
        h('p.text-muted', 'This is a developing feature.'),
        h('pre', 
          'To add a new plugin,\n',
          'symlink its .js file into\n',
          '~/.ssb/plugins.\n',
          '\n',
          'On page-load, Phoenix will\n',
          'fetch and eval() all .js files\n',
          'in the directory.')
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
