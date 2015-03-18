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
        var div = h('div', { innerHTML: mentions.post(markdown.block(c.text), app, msg) })
        if (div.innerText.length <= 255)
          div.style.fontSize = '150%'
        return div
      }
    })[c.type]()
  } catch (e) { }
}

var statsOpts = { handlers: true }
module.exports = function (app, thread, opts) {

  // markup
  
  var content = getContent(app, thread) || h('table', com.prettyRaw.table(app, thread.value.content))
  var viz = com.messageVisuals(app, thread)
  var attachments = com.messageAttachments(app, thread)
  var stats = com.messageStats(app, thread, statsOpts)

  opts.onRender && opts.onRender(thread)

  var subscribeBtn = h('a', { href: '#', onclick: onsubscribe })
  var threadInner = h(viz.cls,
    h('div.in-response-to'), // may be populated by the message page
    h('.message-thread-top',
      h('ul.threadmeta.list-inline',
        h('li.hex', com.userHexagon(app, thread.value.author)),
        h('li', com.userlink(thread.value.author, app.names[thread.value.author]), com.nameConfidence(thread.value.author, app)),
        h('li', com.a('#/', u.prettydate(new Date(thread.value.timestamp), true), { title: 'View message thread' })),
        h('li.button', h('a', { href: '#', onclick: onmarkunread }, 'Mark Unread')),
        h('li.button.strong.pull-right', h('a', { href: '#', onclick: onreply }, 'Reply')),
        h('li.button.pull-right', subscribeBtn),
        h('li.button.pull-right', h('a', { href: '/msg/'+thread.key, target: '_blank' }, 'as JSON'))),
      h('.message', content),
      h('.attachments', attachments),
      stats))

  app.ssb.phoenix.isSubscribed(thread.key, setSubscribeState)
  return h('.message-thread.full-height', threadInner, replies(app, thread, opts))

  // handlers

  function onreply (e) {
    e.preventDefault()

    if (!threadInner.nextSibling || !threadInner.nextSibling.classList || !threadInner.nextSibling.classList.contains('reply-form')) {
      var form = com.postForm(app, thread.key)
      threadInner.parentNode.insertBefore(form, threadInner.nextSibling)
    }
  }

  function onmarkunread (e) {
    e.preventDefault()

    app.ssb.phoenix.markUnread(thread.key, function () {
      window.location.hash = app.lastHubPage
    })
  }

  function onsubscribe (e) {
    e.preventDefault()

    app.ssb.phoenix.toggleSubscribed(thread.key, setSubscribeState)
  }

  // ui state

  function setSubscribeState (err, subscribed) {
    var count = thread.count || 0
    var replies = count + ((count === 1) ? ' reply' : ' replies')
    if (subscribed) {
      subscribeBtn.innerHTML = 'Unsubscribe <small>'+replies+'</small>'
    } else {
      subscribeBtn.innerHTML = 'Subscribe <small>'+replies+'</small>'
    }
  }
}

var replyOpts = { mustRender: true }
function replies (app, thread, opts) {
  // collect replies
  var r = []
  ;(thread.related || []).forEach(function(reply) {
    var subreplies = replies(app, reply, opts)
    if (subreplies)
      r.unshift(subreplies)

    if (reply.value.content.type === 'vote')
      return // dont render vote messages, it'd be a mess

    var el = com.message(app, reply, replyOpts)
    if (el) {
      r.unshift(el)
      opts.onRender && opts.onRender(reply)
    }
  })

  if (r.length)
    return h('.message-replies', r)
  return ''
}