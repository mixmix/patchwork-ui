'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var com = require('../com')

var lastQueryStr = ''
module.exports = function (app) {

  var queryStr = app.page.qs.q || lastQueryStr
  var myfeedOpts = { feed: app.myid }
  function filterFn (msg) {
    var c = msg.value.content

    var hasLinksToUser = (mlib.getLinks(c, myfeedOpts).length > 0)
    var parentLink = mlib.getLinks(c, { rel: 'replies-to', msg: true })[0]
    var isSubscribedToParent = parentLink && app.subscriptions[parentLink.msg]
    if (!(hasLinksToUser || isSubscribedToParent))
      return false

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

  // track read messages :TODO: replace this
  // app.unreadMessages = 0
  // localStorage.readMessages = msgcount

  // markup
  
  /*if (msgs.length === 0) {
    // :TODO: restore this
    content = [
      h('p', h('strong', 'Your inbox is empty!')),
      h('p', 'When somebody @-mentions you or replies to your posts, you\'ll see their message here.')
    ]
  }*/
  var content = com.messageFeed(app, app.ssb.phoenix.createInboxStream, filterFn)
  var searchInput = h('input.search', { type: 'text', placeholder: 'Search', value: queryStr })
  app.setPage('feed', h('.row',
    h('.col-xs-2.col-md-1', com.sidenav(app)),
    h('.col-xs-10.col-md-9', 
      h('.message-feed-ctrls', h('form', { onsubmit: onsearch }, searchInput)),
      content),
    h('.hidden-xs.hidden-sm.col-md-2',
      com.adverts(app),
      h('hr'),
      com.sidehelp(app)
    )
  ))

  // handlers

  function onsearch (e) {
    e.preventDefault()
    window.location.hash = '#/inbox?q='+encodeURIComponent(searchInput.value)
  }
}
module.exports.isHubPage = true