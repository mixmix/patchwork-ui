'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var pull = require('pull-stream')
var multicb = require('multicb')
var com = require('../com')

var mustRenderOpts = { mustRender: true }
module.exports = function (app, opts) {
  opts = opts || {}

  // markup
 
  var feed = h('table.contact-feed')
  var feedContainer = h('.contact-feed-container', feed)
  for (var uid in app.users.profiles) {
    if (!opts.filter || opts.filter(app.users.profiles[uid]))
      feed.appendChild(com.contactListing(app, app.users.profiles[uid], opts.follows))
  }

  return feedContainer
}