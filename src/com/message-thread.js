'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
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
        return h('div', { innerHTML: mentions.post(markdown.block(c.text), app, msg) })
      }
    })[c.type]()
  } catch (e) { }
}

function getAttachments (app, msg) {
  var imageTypes = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml'  
  }
  function isImage (link) {
    if (link.type && link.type.indexOf('image/') !== -1)
      return true
    if (link.name && imageTypes[link.name.split('.').slice(-1)[0].toLowerCase()])
      return true
  }

  return mlib.getLinks(msg.value.content, { toext: true }).map(function (link) {
    var label
    if (isImage(link))
      label = h('img', { src: '/ext/'+link.ext, title: link.name || link.ext })
    else
      label = [com.icon('file'), ' ', link.name, ' ', h('small', (('size' in link) ? u.bytesHuman(link.size) : ''), ' ', link.type||'')]
    return h('a', { href: '/ext/'+link.ext, target: '_blank' }, label)
  })
}

var topOpts = { mustRender: true, topmost: true }
module.exports = function (app, thread, opts) {

  var subscribed = false
  app.subscriptionsDb.get(thread.key, function (err, is) {
    subscribed = !!is
    setSubscribeState()
  })

  // markup
  
  var content = getContent(app, thread) || h('table', com.prettyRaw.table(app, thread.value.content))
  var viz = com.messageVisuals(app, thread)
  var attachments = getAttachments(app, thread)

  opts.onRender && opts.onRender(thread)

  var subscribeBtn = h('a.btn.btn-primary.btn-strong', { href: '#', onclick: onsubscribe }, '+ Subscribe to Thread')
  var threadInner = h(viz.cls,
    h('div.in-response-to'), // may be populated by the message page
    h('ul.threadmeta.list-inline',
      h('li.type', com.icon(viz.icon)),
      h('li', com.userlink(thread.value.author, app.names[thread.value.author]), com.nameConfidence(thread.value.author, app)),
      h('li', com.a('#/', u.prettydate(new Date(thread.value.timestamp), true), { title: 'View message thread' })),
      h('li.button', h('a', { href: '#', onclick: onmarkunread }, 'Mark Unread')),
      h('li.button.strong.pull-right', h('a', { href: '#', onclick: onreply }, 'Reply')),
      h('li.button.pull-right', h('a', { href: '/msg/'+thread.key, target: '_blank' }, 'as JSON'))),
    h('.message.top', content),
    h('.attachments', attachments),
    h('ul.viewmode-select.list-inline', viewModes(thread, opts.viewMode)))

  return h('.message-thread', threadInner, replies(app, thread, opts), h('p', subscribeBtn))

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

    app.accessTimesDb.del(thread.key, function () {
      window.location.hash = app.lastHubPage
    })
  }

  function onsubscribe (e) {
    e.preventDefault()

    if (subscribed)
      app.subscriptionsDb.del(thread.key)
    else
      app.subscriptionsDb.put(thread.key, 1)
    subscribed = !subscribed
    setSubscribeState()
  }

  // ui state

  function setSubscribeState () {
    if (subscribed) {
      subscribeBtn.innerHTML = '&ndash; Unsubscribe from Thread'
    } else {
      subscribeBtn.innerText = '+ Subscribe to Thread'
    }
  }
}

function viewModes (thread, mode) {
  var items = []
  function item (k, v) {
    items.push(h('li.button' + ((mode == k) ? '.selected' : ''), v))
  }
  item('thread', com.a('#/msg/'+thread.key+'?view=thread', 'Thread ('+countForMode(thread, 'thread')+')'))
  item('all', com.a('#/msg/'+thread.key+'?view=all', 'All ('+(thread.count||0)+')'))
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
