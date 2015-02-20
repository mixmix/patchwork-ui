'use strict'
var h = require('hyperscript')
var com = require('./index')
var u = require('../lib/util')
var markdown = require('../lib/markdown')
var mentions = require('../lib/mentions')

function getContent (app, msg) {
  var c = msg.value.content
  try {
    return ({
      post: function () { 
        if (!c.text) return
        return h('div.big-heading', { innerHTML: mentions.post(markdown.block(c.text), app, msg) })
      }
    })[c.type]()
  } catch (e) { }
}

var topOpts = { mustRender: true, topmost: true }
module.exports = function (app, thread, opts) {
  var content = getContent(app, thread) || h('table', com.prettyRaw.table(app, thread.value.content))
  var viz = com.messageVisuals(app, thread)

  return h('.message-thread'+viz.cls,
    h('ul.tools-top.list-inline',
      h('li.type', com.icon(viz.icon)),
      h('li', com.userlink(thread.value.author, app.names[thread.value.author]), com.nameConfidence(thread.value.author, app)),
      h('li', com.a('#/', u.prettydate(new Date(thread.value.timestamp), true), { title: 'View message thread' }))),
    h('.message', content),
    h('ul.tools-bottom.list-inline', viewModes(thread, opts.viewMode)),
    replies(app, thread, opts))
}

function viewModes (thread, mode) {
  var items = []
  function item (k, v) {
    items.push(h('li' + ((mode == k) ? '.selected' : ''), v))
  }
  item('thread', com.a('#/msg/'+thread.key+'?view=thread', 'Thread ('+countForMode(thread, 'thread')+')'))
  item('all', com.a('#/msg/'+thread.key+'?view=all', 'All ('+thread.count+')'))
  return items
}

var replyOpts = { mustRender: true }
function replies (app, thread, opts) {
  // collect replies
  var r = []
  ;(thread.related || []).forEach(function(reply) {
    var subreplies = replies(app, reply, opts)
    if (subreplies)
      r.unshift(subreplies)
    replyOpts.mustRender = !!subreplies || mustRender(reply, opts.viewMode)
    r.unshift(com.message(app, reply, replyOpts))
  })

  if (r.length)
    return h('.message-replies', r)
  return ''
}

function mustRender (msg, mode) {
  if (mode == 'all')
    return true
  if (mode == 'thread' && msg.value.content.type == 'post')
    return true
  return false
}

function countForMode (msg, mode) {
  // `nThis` is how we avoid counting the topmost msg
  function count (msg, nThis) {
    var n = (msg.related || []).reduce(function (n, msg) {
      return n + count(msg, 1)
    }, 0)

    if (mode == 'thread') {
      if (n > 0 || msg.value.content.type == 'post')
        return nThis + n
    }
    return 0
  }
  return count(msg, 0)
}
