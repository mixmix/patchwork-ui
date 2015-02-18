'use strict'
var h = require('hyperscript')
var pull = require('pull-stream')
var mlib = require('ssb-msgs')
var com = require('./index')
var util = require('../lib/util')
var markdown = require('../lib/markdown')
var mentions = require('../lib/mentions')

function shorten (str) {
  if (str.length > 90)
    str = str.slice(0, 87) + '...'
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
        if (opts && opts.full)
          return h('div', user(app, msg.value.author), md(c.text))
        return h('div', user(app, msg.value.author), h('div', shorten(c.text)))
      },
      advert: function () { 
        if (!c.text) return
        if (opts && opts.full)
          return h('div', user(app, msg.value.author), md(c.text))
        return h('div', user(app, msg.value.author), h('div', shorten(c.text)))
      },
      init: function () {
        return ['New user: ', user(app, msg.value.author)]
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
      },
    })[msg.value.content.type]()
  } catch (e) {}
}

var attachmentOpts = { toext: true, rel: 'attachment' }
module.exports = function (app, msg, opts) {

  // markup

  var content = getSummary(app, msg, opts)
  var viz = getVisuals(app, msg, opts) || { cls: '', icon: 'cog' }

  var inboundLinksTd = h('td')
  var numExtLinks = mlib.getLinks(msg.value.content, { toext: true }).length

  if (!content) {
    var raw = com.message.raw(app, msg, { textOnly: true, maxLength: 150, stripQuotes: true })
    content = h('div', user(app, msg.value.author), h('div', raw.split(',').map(function (chunk) {
      // this isnt a perfect alg but its good enough for now
      var parts = chunk.split(':')
      if (parts.length == 1)
        return parts[0]
      var key = parts[0]
      var v = parts.slice(1).join(':')
      return h('span.raw', h('small', key), ' ', v)
    })))
  }

  var msgSummary = h('tr.message-summary'+(viz.cls?'.'+viz.cls:''), { 'data-msg': msg.key },
    h('td', viz.icon ? com.icon(viz.icon) : undefined),
    h('td', content),
    // h('td', com.userlink(msg.value.author, name), nameConfidence)
    // inboundLinksTd,
    // h('td', (numExtLinks>0) ? [com.icon('paperclip'), ' ', numExtLinks] : ''),
    h('td', ago(msg))
  )

  app.ssb.phoenix.getThreadMeta(msg.key, function (err, meta) {
    if (meta && meta.numThreadReplies)
      inboundLinksTd.appendChild(h('span', com.icon('option-vertical'), ' ', meta.numThreadReplies))
  })

  return msgSummary
}

function ago (msg) {
  var str = util.prettydate(new Date(msg.value.timestamp))
  if (str === 'yesterday')
    return '1d'
  return str
}

function user (app, id) {
  var name = app.names[id] || util.shortString(id)
  var nameConfidence = com.nameConfidence(id, app)
  return [com.userlink(id, name), nameConfidence]
}