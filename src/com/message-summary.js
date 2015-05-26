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
        return h('h4', com.icon('off'), ' Created account.')
      },
      post: function () { 
        if (!c.text) return
        return md(c.text)
      },
      fact: function () { 
        if (!c.text) return
        var subjects = mlib.asLinks(c.factAbout).map(function (l) {
          return com.user(app, l.feed)
        })
        if (!subjects.length) return
        var text = mentions.post(u.escapePlain(c.text), app, msg)
        return [/*author(app, msg),*/ h('p', com.icon('info-sign'), ' ', subjects, ' ', h('span', { innerHTML: text }))]
      },
      advert: function () { 
        if (!c.text) return
        return [author(app, msg, h('small.text-muted', ' - advert')), md(c.text)]
      },
      pub: function () {
        return h('h4', com.icon('cloud'), ' Announced a public peer at ', c.address)
      },
      contact: function () {
        var subjects = mlib.asLinks(c.contact).map(function (l) {
          if (l.feed === msg.value.author)
            return 'self'
          return com.user(app, l.feed)
        })
        if (!subjects.length) return

        var items = []
        if (c.following === true)
          items.push(h('h4', com.icon('plus'), ' Followed ', subjects))
        if (c.following === false)
          items.push(h('h4', com.icon('minus'), ' Unfollowed ', subjects))

        if ('trust' in c) {
          var t = +c.trust|0
          if (t === 1)
            items.push(h('h4', com.icon('lock'), ' Trusted ', subjects))
          else if (t === -1)
            items.push(h('h4', com.icon('flag'), ' Flagged ', subjects))
          else if (t === 0)
            items.push(h('h4', com.icon('erase'), ' Untrusted/Unflagged ', subjects))
        }

        if (c.alias) {
          if (c.alias === 'primary')
            items.push(h('h4', com.icon('link'), ' Claimed to be a secondary feed owned by ', subjects))
          else if (c.alias === 'secondary')
            items.push(h('h4', com.icon('link'), ' Claimed ownership of ', subjects))
        }
        if ('alias' in c && !c.alias)
          items.push(h('h4', com.icon('erase'), ' Claimed no alias for ', subjects))

        if ('name' in c)
          items.push(h('h4', com.icon('tag'), ' Named ', subjects, ' ', c.name))

        if ('profilePic' in c)
          items.push(h('h4', com.icon('picture'), ' Set a profile pic for ', subjects))

        if (items.length===0)
          items.push(h('h4', com.icon('option-horizontal'), ' Published a contact for ', subjects))
        return items
      },
      vote: function () {
        var items
        if (c.vote === 1)
          items = [com.icon('triangle-top'), ' Upvoted ']
        else if (c.vote === 0)
          items = [com.icon('erase'), ' Removed vote for ']
        else if (c.vote === -1)
          items = [com.icon('triangle-bottom'), ' Downvoted ']
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

        return h('h4', items)
      }
    })[c.type]()
    if (!s || s.length == 0)
      s = false
    return s
  } catch (e) { return '' }
}

var attachmentOpts = { toext: true, rel: 'attachment' }
module.exports = function (app, msg, opts) {

  // markup

  var content = getSummary(app, msg, opts)
  if (!content) {
    content = [author(app, msg), h('table.raw', com.prettyRaw.table(app, msg.value.content))]
  }

  var msgSummary = h('.message-summary', { 'data-msg': msg.key },
    com.userHexagon(app, msg.value.author, 30),
    h('.message-summary-inner', com.messageStats(app), content))

  fetchRowState(app, msgSummary, msg.key)

  return msgSummary
}

var statsOpts = { recursive: true }
var fetchRowState =
module.exports.fetchRowState = function (app, el, mid) {
  mid = mid || el.dataset.msg
  if (!mid) return
  app.ssb.phoenix.isRead(mid, function (err, isread) {
    if (!err && !isread)
      el.classList.add('unread')
    else
      el.classList.add('read')
  })
  app.ssb.relatedMessages({ id: mid, count: true }, function (err, thread) {
    if (thread)
      setRowState(el, u.calcMessageStats(app, thread, statsOpts))
  })
}

var setRowState =
module.exports.setRowState = function (el, state) {
  if ('comments' in state)
    el.querySelector('.message-stats .comments').dataset.amt = state.comments
}

function ago (msg) {
  var str = u.prettydate(new Date(msg.value.timestamp))
  if (str === 'yesterday')
    str = '1d'
  return h('small.text-muted', str, ' ago')
}

function author (app, msg, addition) {
  return h('p.message-summary-author', com.user(app, msg.value.author), ' ', ago(msg), addition)
}

function fetchReplyLink (app, msg) {
  var link = mlib.asLinks(msg.value.content.repliesTo)[0]
  if (!link || !link.msg)
    return
  var span = h('span', ' ', com.icon('share-alt'), ' ')
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

function fetchMsgLink (app, mid) {
  var link = com.a('#/msg/'+mid, 'this message')
  app.ssb.get(mid, function (err, msg) {
    if (msg)
      link.textContent = link.innerText = shorten((msg.content.type == 'post') ? msg.content.text : msg.content.type, 40) + ' by ' + com.userName(app, msg.author)
  })
  return link
}