'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var pull = require('pull-stream')
var multicb = require('multicb')
var com = require('../com')

module.exports = function (app) {

  var queryStr = app.page.qs.q || ''
  var feedState = com.messageFeed.makeStateObj()
  var feedFn = app.ssb.phoenix.createFeedStream

  function filterFn (msg) {
    var a = msg.value.author
    var c = msg.value.content

    if (!queryStr)
      return true

    var author = app.users.names[a] || a
    var regex = new RegExp(queryStr.replace(/\s/g, '|'))
    if (regex.exec(author) || regex.exec(c.type))
      return true
    if (c.type == 'post' && regex.exec(c.text))
      return true
    return false
  }

  // markup

  var searchInput = h('input.search', { type: 'text', placeholder: 'Search', value: queryStr })
  var composeContainer = h('div')
  var feed = com.messageFeed(app, { feed: feedFn, filter: filterFn, state: feedState })
  app.setPage('feed', h('.row',
    h('.col-xs-1', com.sidenav(app)),
    h('.col-xs-8', 
      h('.header-ctrls', h('form', { onsubmit: onsearch }, searchInput)),
      feed),
    h('.col-xs-3.right-column.full-height',
      h('.right-column-inner',
        com.notifications(app),
        com.friendsHexagrid(app)
      ),
      com.sidehelp(app)
    )
  ))

  function makeUri (opts) {
    opts.q = ('q' in opts) ? opts.q : queryStr
    return '#/feed?q=' + encodeURIComponent(opts.q)
  }

  // handlers

  function onsearch (e) {
    e.preventDefault()
    window.location.hash = makeUri({ q: searchInput.value })
  }
}
