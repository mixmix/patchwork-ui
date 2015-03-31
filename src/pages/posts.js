'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var pull = require('pull-stream')
var multicb = require('multicb')
var com = require('../com')

var feedState
var lastQueryStr, lastList
module.exports = function (app) {

  var queryStr = app.page.qs.q || ''
  var list = app.page.qs.list || 'posts'
  if (!feedState || lastQueryStr != queryStr || lastList != list) {
    // new query, reset the feed
    feedState = com.messageFeed.makeStateObj()
  }
  lastQueryStr = queryStr
  lastList = list

  function filterFn (msg) {
    var c = msg.value.content

    if (list == 'posts') {
      if (c.type !== 'post')
        return false
    }
    else if (list == 'data') {
      // no standard message types
      if (c.type === 'init' || c.type === 'post' || c.type === 'advert' || c.type === 'contact' || c.type === 'vote' || c.type === 'pub')
        return false
    }
    else if (list == 'actions') {
      if (c.type !== 'init' && c.type !== 'contact' && c.type !== 'vote' && c.type !== 'pub')
        return false
    }

    if (!queryStr)
      return true

    var author = app.names[msg.value.author] || msg.value.author
    var regex = new RegExp(queryStr.replace(/\s/g, '|'))
    if (regex.exec(author) || regex.exec(c.type))
      return true
    if ((c.type == 'post' || c.type == 'advert') && regex.exec(c.text))
      return true
    return false
  }

  // markup

  var searchInput = h('input.search', { type: 'text', placeholder: 'Search', value: queryStr })
  var feed = com.messageFeed(app, { feed: app.ssb.createFeedStream, filter: filterFn, state: feedState })
  app.setPage('posts', h('.row',
    h('.col-xs-1', com.sidenav(app)),
    h('.col-xs-8', 
      h('.header-ctrls',
        com.nav({
          current: list,
          items: [
            ['posts',    makeUri({ list: 'posts' }),    'Posts'],
            ['data',     makeUri({ list: 'data' }),     'Data'],
            ['actions',  makeUri({ list: 'actions' }),  'Actions'],
            ['all',      makeUri({ list: 'all' }),      'All']
          ]
        }),
        h('form', { onsubmit: onsearch }, searchInput)),
      feed),
    h('.col-xs-3.right-column.full-height',
      h('.right-column-inner',
        com.notifications(app),
        com.friendsHexagrid(app),
        com.adverts(app)
      ),
      com.sidehelp(app)
    )
  ))
  feed.scrollTop = feedState.lastScrollTop

  function makeUri (opts) {
    opts.q = ('q' in opts) ? opts.q : queryStr
    opts.v = ('list' in opts) ? opts.list : list
    return '#/posts?q=' + encodeURIComponent(opts.q) + '&list=' + encodeURIComponent(opts.v)
  }

  // handlers

  function onsearch (e) {
    e.preventDefault()
    window.location.hash = makeUri({ q: searchInput.value })
  }
}
module.exports.isHubPage = true
