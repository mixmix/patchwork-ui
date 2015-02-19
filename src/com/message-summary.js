'use strict'
var h = require('hyperscript')
var pull = require('pull-stream')
var mlib = require('ssb-msgs')
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
          return h('div', user(app, msg.value.author), replyLink, md(c.text))
        return h('div', user(app, msg.value.author), replyLink, h('div', { innerHTML: mentions.post(u.escapePlain(shorten(c.text)), app, msg) }))
      },
      advert: function () { 
        if (!c.text) return
        if (opts && opts.full)
          return h('div', user(app, msg.value.author), md(c.text))
        return h('div', user(app, msg.value.author), h('div', shorten(c.text)))
      },
      pub: function () {
        return [user(app, msg.value.author), ' says there\'s a public peer at ', c.address]
      },
      name: function () {
        var nameLinks = mlib.getLinks(c, { tofeed: true, rel: 'names' })
        if (nameLinks.length)
          return nameLinks.map(function (l) { return [user(app, msg.value.author), ' says ', user(app, l.feed), ' is ', preprocess(l.name)] })
        return [user(app, msg.value.author), ' is ', preprocess(c.name)]
      },
      follow: function () {
        return mlib.getLinks(c, { tofeed: true, rel: 'follows' })
          .map(function (l) { return [user(app, msg.value.author), ' followed ', user(app, l.feed)] })
          .concat(mlib.getLinks(c, { tofeed: true, rel: 'unfollows' })
            .map(function (l) { return [user(app, msg.value.author), ' unfollowed ', user(app, l.feed)] }))
      },
      trust: function () { 
        return mlib.getLinks(c, { tofeed: true, rel: 'trusts' })
          .map(function (l) {
            if (l.value > 0)
              return [user(app, msg.value.author), ' trusted ', user(app, l.feed)]
            if (l.value < 0)
              return [user(app, msg.value.author), ' flagged ', user(app, l.feed)]
            return [user(app, msg.value.author), ' untrusted/unflagged ', user(app, l.feed)]
          })
      }
    })[c.type]()
    if (!s || s.length == 0)
      s = false
    return s
  } catch (e) { return '' }
}

function getVisuals (app, msg, opts) {
  try {
    return ({
      post:   function () { return { cls: 'postmsg', icon: 'comment' } },
      advert: function () { return { cls: 'advertmsg', icon: 'bullhorn' } },
      init:   function () { return { cls: 'initmsg', icon: 'off' } },
      name:   function () { return { cls: 'namemsg', icon: 'tag' } },
      pub:    function () { return { cls: 'pubmsg', icon: 'cloud' } },
      follow: function () {
        if (mlib.getLinks(msg.value.content, { tofeed: true, rel: 'follows' }).length)
          return { cls: 'followmsg', icon: 'plus' }
        if (mlib.getLinks(msg.value.content, { tofeed: true, rel: 'unfollows' }).length)
          return { cls: 'unfollowmsg', icon: 'minus' }
      },
      trust: function () { 
        var l = mlib.getLinks(msg.value.content, { tofeed: true, rel: 'trusts' })[0]
        if (l.value > 0)
          return { cls: 'trustmsg', icon: 'lock' }
        if (l.value < 0)
          return { cls: 'flagmsg', icon: 'flag' }
      }
    })[msg.value.content.type]()
  } catch (e) {}
}

var attachmentOpts = { toext: true, rel: 'attachment' }
module.exports = function (app, msg, opts) {

  // markup

  var content = getSummary(app, msg, opts)
  var viz = getVisuals(app, msg, opts) || { cls: '', icon: 'envelope' }

  var inboundLinksTd = h('td')
  var numExtLinks = mlib.getLinks(msg.value.content, { toext: true }).length

  if (!content) {
    var raw = prettyRaw(app, msg.value.content)
    content = h('div', user(app, msg.value.author), h('div', raw))
  }

  var msgSummary = h('tr.message-summary'+(viz.cls?'.'+viz.cls:''), { 'data-msg': msg.key },
    h('td', viz.icon ? com.icon(viz.icon) : undefined),
    h('td', content),
    // h('td', com.userlink(msg.value.author, name), nameConfidence)
    // inboundLinksTd,
    // h('td', (numExtLinks>0) ? [com.icon('paperclip'), ' ', numExtLinks] : ''),
    h('td.text-muted', ago(msg))
  )

  app.ssb.phoenix.getThreadMeta(msg.key, function (err, meta) {
    if (meta && meta.numThreadReplies)
      inboundLinksTd.appendChild(h('span', com.icon('option-vertical'), ' ', meta.numThreadReplies))
  })

  return msgSummary
}

function ago (msg) {
  var str = u.prettydate(new Date(msg.value.timestamp))
  if (str === 'yesterday')
    return '1d'
  return str
}

function message (link) {
  return com.a('#/msg/'+link.msg, link.rel)
}

function user (app, id) {
  var name = userName(app, id)
  var nameConfidence = com.nameConfidence(id, app)
  return [com.userlink(id, name), nameConfidence]
}

function userName (app, id) {
  return name = app.names[id] || u.shortString(id)
}

function file (link) {
  var name = link.name || ''
  var details = (('size' in link) ? u.bytesHuman(link.size) : '') + ' ' + (link.type||'')
  return h('a', { href: '/ext/'+link.ext, target: '_blank', title: name +' '+details }, name, ' ', h('small', details))
}

function fetchReplyLink (app, msg) {
  var link = mlib.getLinks(msg.value.content, { rel: 'replies-to', tomsg: true })[0]
  if (!link)
    return
  var span = h('span', ' replied to ')
  app.ssb.get(link.msg, function (err, msg2) {
    var str
    if (msg2) {
      str = [shorten((msg2.content.type == 'post') ? msg2.content.text : msg2.content.type, 40) + ' by ' + userName(app, msg2.author)]
    } else {
      str = link.msg
    }
    span.appendChild(h('a.text-muted', { href: '#/msg/'+link.msg }, str))
  })
  return span
}

function prettyRaw (app, obj, path) {

  function col (k, v) {
    return h('span.pretty-raw', h('small', path+k), v)
  }

  var els = []
  path = (path) ? path + '.' : ''
  for (var k in obj) {

    if (obj[k] && typeof obj[k] == 'object') {
      if (obj[k].rel) {
        if (obj[k].ext)
          els.push(col(k, file(obj[k])))
        if (obj[k].msg)
          els.push(col(k, message(obj[k])))
        if (obj[k].feed)
          els.push(col(k, user(app, obj[k].feed)))
      } else
        els.push(prettyRaw(app, obj[k], path+k))
    } else if (k == 'msg')
      els.push(col(k, message(obj)))
    else if (k == 'ext')
      els.push(col(k, file(obj)))
    else if (k == 'feed')
      els.push(col(k, user(app, obj.feed)))
    else
      els.push(col(k, ''+obj[k]))
  }

  return els
}