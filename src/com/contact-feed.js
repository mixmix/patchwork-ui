'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var pull = require('pull-stream')
var multicb = require('multicb')
var infiniscroll = require('infiniscroll')
var com = require('../com')

var mustRenderOpts = { mustRender: true }
module.exports = function (app, opts) {
  opts = opts || {}

  var contacts = []
  for (var uid in app.users.profiles) {
    if (!opts.filter || opts.filter(app.users.profiles[uid]))
      contacts.push(app.users.profiles[uid])
  }

  // markup
 
  var feed = h('table.contact-feed', { 'data-empty-overlay': opts.empty || 'Empty' })
  var feedContainer = infiniscroll(h('.contact-feed-container.full-height', feed), { fetchBottom: fetchBottom })

  // profile fetching

  var cursor=0
  function fetchBottom (cb) {
    if (cursor > contacts.length) // no more
      return (cb && cb())

    var end = cursor + 30
    for (cursor; cursor < end && cursor < contacts.length; cursor++) {
      var el = com.contactListing(app, contacts[cursor], opts.follows)
      el && feed.appendChild(el)
    }

    cb && cb()
  }
  fetchBottom()

  return feedContainer
}