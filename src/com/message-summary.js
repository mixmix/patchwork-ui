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

function getSummary (app, msg) {
  var c = msg.value.content

  function md (str) {
    return h('.markdown', { innerHTML: mentions.post(markdown.block(str), app, msg) })
  }
  try {
    var s = ({
      init: function () {
        return [com.icon('off'), ' created account.']
      },
      post: function () { 
        if (!c.text) return
        if (mlib.link(c.repliesTo, 'msg'))
          return [com.icon('share-alt'), ' replied ', ago(msg), h('a.msg-link', { style: 'color: #555', href: '#/msg/'+c.repliesTo.msg }, shorten(c.text, 255))]
        if (mlib.links(c.mentions).filter(function(link) { return link.feed == app.user.id }).length)
          return [com.icon('hand-right'), ' mentioned you ', ago(msg), h('a.msg-link', { style: 'color: #555', href: '#/msg/'+msg.key }, shorten(c.text, 255))]
        return md(c.text)
      },
      fact: function () { 
        if (!c.text) return
        var subjects = mlib.asLinks(c.factAbout).map(function (l) {
          return com.user(app, l.feed)
        })
        if (!subjects.length) return
        var text = mentions.post(u.escapePlain(c.text), app, msg)
        return [com.icon('info-sign'), ' ', subjects, ' ', h('span', { innerHTML: text })]
      },
      pub: function () {
        return [com.icon('cloud'), ' announced a public peer at ', c.address]
      },
      contact: function () {
        var subjects = mlib.asLinks(c.contact).map(function (l) {
          if (l.feed === msg.value.author)
            return 'self'
          if (l.feed === app.user.id)
            return 'you'
          return com.user(app, l.feed)
        })
        if (!subjects.length) return

        var items = []
        if (c.following === true)
          items.push(['followed ', subjects])
        if (c.following === false)
          items.push(['unfollowed ', subjects])

        if ('trust' in c) {
          var t = +c.trust|0
          if (t == -1)
            items.push([com.icon('flag'), ' flagged ', subjects])
          else if (t === 0)
            items.push([com.icon('erase'), ' unflagged ', subjects])
        }

        if (c.alias) {
          if (c.alias === 'primary')
            items.push([com.icon('link'), ' claimed to be a secondary feed owned by ', subjects])
          else if (c.alias === 'secondary')
            items.push([com.icon('link'), ' claimed ownership of ', subjects])
        }
        if ('alias' in c && !c.alias)
          items.push([com.icon('erase'), ' claimed no alias for ', subjects])

        if ('name' in c)
          items.push([com.icon('tag'), ' named ', subjects, ' ', c.name])

        if ('profilePic' in c)
          items.push([com.icon('picture'), ' set a profile pic for ', subjects])

        if (items.length===0)
          items.push([com.icon('option-horizontal'), ' published a contact for ', subjects])
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
        if (c.voteTopic.msg)
          items.push(fetchMsgLink(app, c.voteTopic.msg))
        else if (c.voteTopic.feed)
          items.push(com.user(app, c.voteTopic.feed))
        else if (c.voteTopic.ext)
          items.push(com.a('/ext/'+c.voteTopic.ext, 'this file'))
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

module.exports = function (app, msg, opts) {

  // markup

  var content = getSummary(app, msg, opts)
  if (!content)
    return

  var msgSummary = h('.message-summary',
    com.userImg(app, msg.value.author),
    h('.message-summary-content', com.user(app, msg.value.author), ' ', content)
  )

  return msgSummary

}

function ago (msg) {
  var str = u.prettydate(new Date(msg.value.timestamp))
  if (str == 'yesterday')
    str = '1d'
  return h('small.text-muted', str, ' ago')
}

function fetchMsgLink (app, mid) {
  var link = h('a.msg-link', { href: '#/msg/'+mid }, 'this message')
  app.ssb.get(mid, function (err, msg) {
    if (msg)
      link.textContent = link.innerText = shorten((msg.content.type == 'post') ? msg.content.text : 'this '+msg.content.type, 255)
  })
  return link
}