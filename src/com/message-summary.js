'use strict'
var h = require('hyperscript')
var pull = require('pull-stream')
var mlib = require('ssb-msgs')
var com = require('./index')
var util = require('../lib/util')
var markdown = require('../lib/markdown')
var mentions = require('../lib/mentions')

function shorten (str) {
  if (str.length > 60)
    str = str.slice(0, 57) + '...'
  return str
}

function getSummary (app, msg, opts) {

  function md (str) {
    return h('div', { innerHTML: mentions.post(markdown.block(str), app, msg) })
  }

  var preprocess = (opts && opts.full) ? function(v){return v} : shorten
  try {
    var s = ({
      post: function () { return ((opts && opts.full) ? md : shorten)(msg.value.content.text) },
      advert: function () { return ((opts && opts.full) ? md : shorten)(msg.value.content.text) },
      init: function () {
        return ['New user: ', preprocess(app.names[msg.value.author] || msg.value.author)]
      },
      name: function () {
        var nameLinks = mlib.getLinks(msg.value.content, { tofeed: true, rel: 'names' })
        if (nameLinks.length)
          return nameLinks.map(function (l) { return [preprocess(app.names[l.feed] || l.feed), ' is ', preprocess(l.name)] })
        return [preprocess(app.names[msg.value.author] || msg.value.author), ' is ', preprocess(msg.value.content.name)]
      },
      follow: function () {
        return mlib.getLinks(msg.value.content, { tofeed: true, rel: 'follows' })
          .map(function (l) { return ['Followed ', preprocess(app.names[l.feed] || l.feed)] })
          .concat(mlib.getLinks(msg.value.content, { tofeed: true, rel: 'unfollows' })
            .map(function (l) { return ['Unfollowed ', preprocess(app.names[l.feed] || l.feed)] }))
      },
      trust: function () { 
        return mlib.getLinks(msg.value.content, { tofeed: true, rel: 'trusts' })
          .map(function (l) {
            if (l.value > 0)
              return ['Trusted ', preprocess(app.names[l.feed] || l.feed)]
            if (l.value < 0)
              return ['Flagged ', preprocess(app.names[l.feed] || l.feed)]
            return 'Untrusted/Unflagged '+preprocess(app.names[l.feed] || l.feed)
          })
      },
    })[msg.value.content.type]()
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
  var viz = getVisuals(app, msg, opts) || { cls: '', icon: false }

  var name = app.names[msg.value.author] || util.shortString(msg.value.author)
  var nameConfidence = com.nameConfidence(msg.value.author, app)

  var msgSummary = h('tr.message-summary'+(viz.cls?'.'+viz.cls:''), { 'data-msg': msg.key },
    h('td', com.userlink(msg.value.author, name), nameConfidence),
    h('td', viz.icon ? com.icon(viz.icon) : undefined),
    h('td', h('div', content || h('span.text-muted', msg.value.content.type)))
    // h('td.text-muted', util.prettydate(new Date(msg.value.timestamp)))
  )
  return msgSummary
}

function noHtmlLen (str) {
  var entityLen = 0
  str.replace(/<.*>/g, function($0) {
    entityLen += $0.length
  })
  return str.length - entityLen
}