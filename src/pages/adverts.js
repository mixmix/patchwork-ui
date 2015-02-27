'use strict'
var h = require('hyperscript')
var multicb = require('multicb')
var com = require('../com')
var util = require('../lib/util')
var markdown = require('../lib/markdown')

module.exports = function (app) {

  var queryStr = app.page.qs.q || ''
  var myfeedOpts = { feed: app.myid }
  function filterFn (msg) {
    var c = msg.value.content

    if (!queryStr)
      return true

    var author = app.names[msg.value.author] || msg.value.author
    var regex = new RegExp(queryStr.replace(/\s/g, '|'))
    if (regex.exec(author) || regex.exec(c.text))
      return true
    return false
  }

  // markup 

  var content = com.messageFeed(app, app.ssb.phoenix.createAdvertStream, filterFn)
  var searchInput = h('input.search', { type: 'text', placeholder: 'Search', value: queryStr })
  app.setPage('feed', h('.row',
    h('.col-xs-1', com.sidenav(app)),
    h('.col-xs-9', 
      h('.message-feed-ctrls', h('form', { onsubmit: onsearch }, searchInput)),
      content
    ),
    h('.col-xs-2',
      h('.well.well-sm', 'Create ads to let your friends know about events, websites, etc. ', com.a('#/help/adverts', 'About')),
      com.advertForm(app)
    )
  ))

  // handlers

  function onsearch (e) {
    e.preventDefault()
    window.location.hash = '#/adverts?q='+encodeURIComponent(searchInput.value)
  }
}