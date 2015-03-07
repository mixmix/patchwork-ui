'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var pull = require('pull-stream')
var multicb = require('multicb')
var com = require('../com')

var feedState
var lastQueryStr
module.exports = function (app) {

  var queryStr = app.page.qs.q || ''
  if (!feedState || lastQueryStr != queryStr) {
    // new query, reset the feed
    feedState = com.messageFeed.makeStateObj()
  }
  lastQueryStr = queryStr

  function filterFn (msg) {
    var c = msg.value.content

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
  var feed = com.messageFeed(app, app.ssb.createFeedStream, filterFn, null, feedState)
  app.setPage('posts', h('.row',
    h('.col-xs-1', com.sidenav(app)),
    h('.col-xs-9',
      h('.message-feed-ctrls', h('form', { onsubmit: onsearch }, searchInput)),
      feed
      //com.introhelp(app)
    ),
    h('.col-xs-2',
      com.adverts(app),
      h('hr'),
      com.sidehelp(app)
    )
  ))
  feed.scrollTop = feedState.lastScrollTop

  // handlers

  function onsearch (e) {
    e.preventDefault()
    window.location.hash = '#/posts?q='+encodeURIComponent(searchInput.value)
  }
}
module.exports.isHubPage = true
