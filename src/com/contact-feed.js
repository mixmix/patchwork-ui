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
 
  var items = []
  for (var uid in app.users.profiles) {
    if (!opts.filter || opts.filter(app.users.profiles[uid]))
      items.push(com.contactListing(app, app.users.profiles[uid], opts.follows, opts))
  }

  items.sort(function (a, b) {
    return b.dataset.followers - a.dataset.followers
  })

  return h('.contact-feed-container', h('.contact-feed', items))
}