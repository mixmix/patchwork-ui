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
  var list = app.page.qs.list || 'latest'
  if (!feedState || lastQueryStr != queryStr || lastList != list) {
    // new query, reset the feed
    feedState = com.messageFeed.makeStateObj()
  }
  lastQueryStr = queryStr
  lastList = list
  var myprofile = app.profiles[app.myid]

  var feedFn = app.ssb.createFeedStream
  if (list == 'inbox')
    feedFn = app.ssb.phoenix.createInboxStream

  function filterFn (msg) {
    var a = msg.value.author
    var c = msg.value.content

    // filter out people not followed directly
    if (list != 'inbox' && a !== app.myid && (!myprofile.assignedTo[a] || !myprofile.assignedTo[a].following))
      return false

    if (list == 'latest' && c.type !== 'post')
      return false

    if (!queryStr)
      return true

    var author = app.names[a] || a
    var regex = new RegExp(queryStr.replace(/\s/g, '|'))
    if (regex.exec(author) || regex.exec(c.type))
      return true
    if (c.type == 'post' && regex.exec(c.text))
      return true
    return false
  }

  // markup

  var searchInput = h('input.search', { type: 'text', placeholder: 'Search', value: queryStr })
  var feed = com.messageFeed(app, { feed: feedFn, filter: filterFn, state: feedState })
  app.setPage('feed', h('.row',
    h('.col-xs-1', com.sidenav(app)),
    h('.col-xs-8', 
      h('.header-ctrls',
        com.nav({
          current: list,
          items: [
            ['latest', makeUri({ list: 'latest' }), 'Latest'],
            ['inbox',  makeUri({ list: 'inbox' }),  'Inbox ('+app.indexCounts.inboxUnread+')'],            
            ['all',    makeUri({ list: 'all' }),    'All']
          ]
        }),
        h('form', { onsubmit: onsearch }, searchInput)),
      feed),
    h('.col-xs-3.right-column.full-height',
      h('.right-column-inner',
        com.notifications(app),
        com.friendsHexagrid(app)
      ),
      com.sidehelp(app)
    )
  ))
  feed.scrollTop = feedState.lastScrollTop

  function makeUri (opts) {
    opts.q = ('q' in opts) ? opts.q : queryStr
    opts.v = ('list' in opts) ? opts.list : list
    return '#/feed?q=' + encodeURIComponent(opts.q) + '&list=' + encodeURIComponent(opts.v)
  }

  // handlers

  function onsearch (e) {
    e.preventDefault()
    window.location.hash = makeUri({ q: searchInput.value })
  }
}
module.exports.isHubPage = true
