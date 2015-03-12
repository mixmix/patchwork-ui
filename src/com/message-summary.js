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
    return h('.markdown', { innerHTML: mentions.post(markdown.block(str), app, msg) })
  }

  var c = msg.value.content
  try {
    var s = ({
      init: function () {
        return [com.user(app, msg.value.author), ' account created. ', ago(msg)]
      },
      post: function () { 
        if (!c.text) return
        var replyLink = fetchReplyLink(app, msg)
        return [com.user(app, msg.value.author), ' ', ago(msg), replyLink, md(c.text)]
      },
      advert: function () { 
        if (!c.text) return
        return [h('small', 'advert by ', com.user(app, msg.value.author), ' ', ago(msg)), md(c.text)]
      },
      pub: function () {
        return [com.user(app, msg.value.author), ' says there\'s a public peer at ', c.address, ' ', ago(msg)]
      },
      contact: function () {
        var changes = []
        if (c.following === true)
          changes.push('followed')
        if (c.following === false)
          changes.push('unfollowed')
        if ('trust' in c) {
          var t = +c.trust|0
          if (t === 1)
            changes.push('trusted')
          else if (t === -1)
            changes.push('flagged')
          else if (t === 0)
            changes.push('untrusted/unflagged')
        }
        if (c.master) {
          if (c.master.feed === msg.value.author)
            changes.push('claimed ownership of')
          else
            changes.push('claimed an owner')
        }
        if (c.myuser === false)
          changes.push('removed master')
        if ('name' in c)
          changes.push('named')
        if ('profilePic' in c)
          changes.push('set a profile pic for')
        if (changes.length===0)
          changes.push('published a contact link to')
        return [
          com.user(app, msg.value.author),
          ' ', changes.join(', '), ' ',
          mlib.asLinks(c.contact).map(function (l) {
            if (l.feed === msg.value.author)
              return 'self'
            return com.user(app, l.feed)
          }),
          ' ', ago(msg)
        ]
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

  var content = getSummary(app, msg, opts)
  if (!content) {
    var raw = com.prettyRaw(app, msg.value.content).slice(0,4)
    content = h('div', h('span.pretty-raw', com.user(app, msg.value.author)), raw)
  }

  var msgSummary = h('tr.message-summary', { 'data-msg': msg.key },
    h('td', com.hexagon(com.profilePicUrl(app, msg.value.author))),
    h('td', content)
    // h('td.text-muted', ago(msg))
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
    str = '1d'
  return h('small.text-muted', str, ' ago')
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