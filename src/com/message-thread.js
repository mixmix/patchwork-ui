'use strict'
var h = require('hyperscript')
var com = require('./index')
var u = require('../lib/util')
var markdown = require('../lib/markdown')
var mentions = require('../lib/mentions')

var statsOpts = { handlers: true }
module.exports = function (app, thread, opts) {

  // markup
  
  opts && opts.onrender && opts.onrender(thread)
  return h('.message-thread', 
    h('.message-thread-top', com.message(app, thread, opts)), 
    replies(app, thread, opts))

  // handlers

  function onreply (e) {
    e.preventDefault()

    if (!msgThreadTop.querySelector('.reply-form'))
      msgThreadTop.appendChild(com.composer(app, thread, { onpost: opts && opts.onpost }))
  }
}

function replies (app, thread, opts) {
  // collect replies
  var r = []
  ;(thread.related || []).forEach(function(reply) {
    if (reply.value.content.type !== 'vote') { // dont render vote messages, it'd be a mess     
      var el = com.message(app, reply, opts)
      if (el) {
        r.push(el)
        opts && opts.onrender && opts.onrender(reply)
      }
    }

    var subreplies = replies(app, reply, opts)
    if (subreplies)
      r.push(subreplies)
  })

  if (r.length)
    return h('.message-replies', r)
  return ''
}