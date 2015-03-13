'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var com = require('../com')

module.exports = function (app) {

  var queryStr = app.page.qs.q || ''
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
  
  /*if (msgs.length === 0) {
    // :TODO: restore this
    content = [
      h('p', h('strong', 'Your inbox is empty!')),
      h('p', 'When somebody @-mentions you or replies to your posts, you\'ll see their message here.')
    ]
  }*/
  var content = com.messageFeed(app, { feed: app.ssb.phoenix.createInboxStream, filter: filterFn })
  var searchInput = h('input.search', { type: 'text', placeholder: 'Search', value: queryStr })
  app.setPage('feed', h('.row',
    h('.col-xs-1', com.sidenav(app)),
    h('.col-xs-8', 
      h('.header-ctrls', h('form', { onsubmit: onsearch }, searchInput)),
      content),
    h('.col-xs-3.full-height',
      com.notifications(app),
      com.adverts(app),
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