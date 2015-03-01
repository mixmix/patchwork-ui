'use strict'
var h = require('hyperscript')
var pull = require('pull-stream')
var mlib = require('ssb-msgs')
var multicb = require('multicb')
var com = require('./index')
var u = require('../lib/util')
var markdown = require('../lib/markdown')
var mentions = require('../lib/mentions')

function shorten (str, n) {
  n = n || 120
  if (str.length > n)
    str = str.slice(0, n-3) + '...'
  return str
}

function getSummary (app, msg, opts) {

  function md (str) {
    return h('div', { innerHTML: mentions.post(markdown.block(str), app, msg) })
  }

  var c = msg.value.content
  var preprocess = (opts && opts.full) ? function(v){return v} : shorten
  try {
    var s = ({
      post: function () { 
        if (!c.text) return
        var replyLink = fetchReplyLink(app, msg)
        if (opts && opts.full)
          return h('div', com.user(app, msg.value.author), replyLink, md(c.text))
        return h('div', com.user(app, msg.value.author), replyLink, h('div', { innerHTML: mentions.post(u.escapePlain(c.text), app, msg) }))
      },
      advert: function () { 
        if (!c.text) return
        if (opts && opts.full)
          return h('div', com.user(app, msg.value.author), md(c.text))
        return h('div', com.user(app, msg.value.author), h('div', shorten(c.text)))
      },
      pub: function () {
        return [com.user(app, msg.value.author), ' says there\'s a public peer at ', c.address]
      },
      name: function () {
        if (c.feed)
          return // legacy kludge, was naming another user
        return [com.user(app, msg.value.author), ' is ', preprocess(c.name)]
      },
      contact: function () {
        var changes = []
        if ('following' in c) {
          if (c.following)
            changes.push('followed')
          else
            changes.push('unfollowed')
        }
        if ('trust' in c) {
          var t = +c.trust|0
          if (t === 1)
            changes.push('trusted')
          else if (t === -1)
            changes.push('flagged')
          else if (t === 0)
            changes.push('untrusted/unflagged')
        }
        if ('name' in c)
          changes.push('named')
        return [
          com.user(app, msg.value.author),
          ' ', changes.join(', '), ' ',
          mlib.asLinks(c.contact).map(function (l) { return com.user(app, l.feed) }),
          ' ', (c.name||'')
        ]
      },
      trust: function () { 
        return mlib.asLinks(c.target).map(function (l) {
          if (c.trust > 0)
            return [com.user(app, msg.value.author), ' trusted ', com.user(app, l.feed)]
          if (c.trust < 0)
            return [com.user(app, msg.value.author), ' flagged ', com.user(app, l.feed)]
          return [com.user(app, msg.value.author), ' untrusted/unflagged ', com.user(app, l.feed)]
        })
      }
    })[c.type]()
    if (!s || s.length == 0)
      s = false
    return s
  } catch (e) { return '' }
}

var attachmentOpts = { toext: true, rel: 'attachment' }
module.exports = function (app, msg, opts) {

  var done = multicb({ pluck: 1 })
  app.ssb.phoenix.isRead(msg.key, function (err, read) {
    setRowState(msgSummary, { read: !!read })
  })

  // markup

  var viz = com.messageVisuals(app, msg)
  var content = getSummary(app, msg, opts)
  if (!content) {
    viz = { cls: '.rawmsg', icon: null }
    var raw = com.prettyRaw(app, msg.value.content).slice(0,4)
    content = h('div', h('span.pretty-raw', com.user(app, msg.value.author)), raw)
  }

  var msgSummary = h('tr.message-summary'+viz.cls, { 'data-msg': msg.key },
    h('td', /*viz.icon ? com.icon(viz.icon) :*/ undefined),
    h('td', content),
    h('td.text-muted', ago(msg))
  )

  return msgSummary
}

var setRowState =
module.exports.setRowState = function (el, state) {   
  if ('read' in state) {
    if (state.read) {   
      el.classList.add('read')   
    } else {   
      el.classList.remove('read')
    }
  }
}

function ago (msg) {
  var str = u.prettydate(new Date(msg.value.timestamp))
  if (str === 'yesterday')
    return '1d'
  return str
}

function fetchReplyLink (app, msg) {
  var link = mlib.asLinks(msg.value.content.repliesTo)[0]
  if (!link || !link.msg)
    return
  var span = h('span', ' replied to ')
  app.ssb.get(link.msg, function (err, msg2) {
    var str
    if (msg2) {
      str = [shorten((msg2.content.type == 'post') ? msg2.content.text : msg2.content.type, 40) + ' by ' + com.userName(app, msg2.author)]
    } else {
      str = link.msg
    }
    span.appendChild(h('a.text-muted', { href: '#/msg/'+link.msg }, str))
  })
  return span
}