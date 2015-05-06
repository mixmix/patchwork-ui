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
        var div = h('.markdown', { innerHTML: mentions.post(markdown.block(c.text), app, msg) })
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

  opts && opts.onrender && opts.onrender(thread)

  // var subscribeBtn = h('a.subscribe-toggle', { href: '#', onclick: onsubscribe, title: 'Subscribe to replies' })
  var msgThreadTop = h('.message-thread-top',
    h('ul.threadmeta.list-inline',
      h('li.hex', com.userHexagon(app, thread.value.author)),
      h('li', com.userlink(thread.value.author, app.users.names[thread.value.author]), com.nameConfidence(thread.value.author, app)),
      h('li', com.a('#/msg/'+thread.key, u.prettydate(new Date(thread.value.timestamp), true), { title: 'View message thread' })),
      h('li', h('a', { href: '#', onclick: onreply }, 'reply')),
      // h('li.pull-right', subscribeBtn),
      h('li.pull-right', h('a', { href: '/msg/'+thread.key, target: '_blank' }, 'as JSON'))),
    h('.message', content),
    com.messageAttachments(app, thread),
    com.messageStats(app, thread, statsOpts))
  var threadInner = h('div',
    h('div.in-response-to'), // may be populated by the message page
    msgThreadTop)

  // app.ssb.phoenix.isSubscribed(thread.key, setSubscribeState)
  return h('.message-thread', threadInner, replies(app, thread, opts))

  // handlers

  function onreply (e) {
    e.preventDefault()

    if (!msgThreadTop.querySelector('.reply-form'))
      msgThreadTop.appendChild(com.composer(app, thread, { onpost: opts && opts.onpost }))
  }

  /*function onsubscribe (e) {
    e.preventDefault()

    app.ssb.phoenix.toggleSubscribed(thread.key, setSubscribeState)
  }*/

  // ui state

  /*function setSubscribeState (err, subscribed) {
    subscribeBtn.innerHTML = ''
    if (subscribed) {
      subscribeBtn.classList.add('selected')
      subscribeBtn.appendChild(com.icon('star'))
    } else {
      subscribeBtn.classList.remove('selected')
      subscribeBtn.appendChild(com.icon('star-empty'))
    }
  }*/
}

function replies (app, thread, opts) {
  // collect replies
  var r = []
  ;(thread.related || []).forEach(function(reply) {
    var subreplies = replies(app, reply, opts)
    if (subreplies)
      r.unshift(subreplies)

    if (reply.value.content.type === 'vote')
      return // dont render vote messages, it'd be a mess

    var el = com.message(app, reply, opts)
    if (el) {
      r.unshift(el)
      opts && opts.onrender && opts.onrender(reply)
    }
  })

  if (r.length)
    return h('.message-replies', r)
  return ''
}