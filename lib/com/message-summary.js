'use strict'
var h = require('hyperscript')
var pull = require('pull-stream')
var mlib = require('ssb-msgs')
var ssbref = require('ssb-ref')
var multicb = require('multicb')
var app = require('../app')
var com = require('./index')
var u = require('../util')
var markdown = require('../markdown')
var mentions = require('../mentions')

function shorten (str, n) {
  n = n || 120
  if (str.length > n)
    str = str.slice(0, n-3) + '...'
  return str
}

function getSummary (msg) {
  var c = msg.value.content

  function md (str) {
    return h('.markdown', { innerHTML: mentions.post(markdown.block(str), msg) })
  }
  function reason (str, m) {
    return h('span', { innerHTML: mentions.render(markdown.emojis(str), m) })
  }
  try {
    var s = ({
      init: function () {
        return [com.icon('off'), ' created account.']
      },
      post: function () { 
        if (!c.text) return
        if (mlib.link(c.repliesTo, 'msg'))
          return [com.icon('share-alt'), ' replied ', ago(msg), h('a.msg-link', { style: 'color: #555', href: '#/msg/'+mlib.link(c.repliesTo).link }, shorten(c.text, 255))]
        if (mlib.links(c.mentions).filter(function(link) { return mlib.link(link).link == app.user.id }).length)
          return [com.icon('hand-right'), ' mentioned you ', ago(msg), h('a.msg-link', { style: 'color: #555', href: '#/msg/'+msg.key }, shorten(c.text, 255))]
        return md(c.text)
      },
      fact: function () { 
        if (!c.text) return
        var subjects = mlib.links(c.factAbout).map(function (l) {
          return com.user(l.link)
        })
        if (!subjects.length) return
        var text = mentions.post(u.escapePlain(c.text), msg)
        return [com.icon('info-sign'), ' ', subjects, ' ', h('span', { innerHTML: text })]
      },
      pub: function () {
        return [com.icon('cloud'), ' announced a public peer at ', c.address]
      },
      contact: function () {
        var subjects = mlib.links(c.contact).map(function (l) {
          if (l.link === msg.value.author)
            return 'self'
          if (l.link === app.user.id)
            return 'you'
          return com.user(l.link)
        })
        if (!subjects.length) return

        var items = []
        if (c.following === true)
          items.push(['followed ', subjects])
        else if (c.blocking === true)
          items.push(['blocked ', subjects])
        else if (c.following === false)
          items.push(['unfollowed ', subjects])
        else if (c.blocking === false)
          items.push(['unblocked ', subjects])

        if (items.length===0)
          return
        items.push([' ', ago(msg)])
        return items
      },
      vote: function () {
        var items
        if (c.vote == 1)
          items = [ago(msg), ' ', com.icon('star'), ' starred']
        else if (c.vote <= 0)
          items = [ago(msg), ' ', com.icon('erase'), ' unstarred']
        else
          return false

        if (!c.voteTopic)
          return false
        if (ssbref.isMsgId(topic.link))
          items.push(fetchMsgLink(topic.link))
        else if (ssbref.isFeedId(topic.link))
          items.push(com.user(topic.link))
        else if (ssbref.isBlobId(topic.link))
          items.push(com.a('#/webiew/'+topic.link, 'this file'))
        else
          return false

        return items
      }
    })[c.type]()
    if (!s || s.length == 0)
      s = false
    return s
  } catch (e) { return '' }
}

module.exports = function (msg, opts) {

  // markup

  var content = getSummary(msg, opts)
  if (!content)
    return

  var msgSummary = h('.message-summary',
    com.userImg(msg.value.author),
    h('.message-summary-content', com.user(msg.value.author), ' ', content)
  )

  return msgSummary

}

module.exports.raw = function (msg, opts) {
  // markup

  var msgSummary = h('.message-summary',
    com.userImg(msg.value.author),
    h('.message-summary-content', 
      com.user(msg.value.author), ' ', ago(msg), ' ', com.a('#/msg/'+msg.key, msg.key),
      h('table.raw', com.prettyRaw.table(msg.value.content)
    ))
  )

  return msgSummary
}

function ago (msg) {
  var str = u.prettydate(new Date(msg.value.timestamp))
  if (str == 'yesterday')
    str = '1d'
  return h('small.text-muted', str, ' ago')
}

function fetchMsgLink (mid) {
  var link = h('a.msg-link', { href: '#/msg/'+mid }, 'this message')
  app.ssb.get(mid, function (err, msg) {
    if (msg)
      link.textContent = link.innerText = shorten((msg.content.type == 'post') ? msg.content.text : 'this '+msg.content.type, 255)
  })
  return link
}