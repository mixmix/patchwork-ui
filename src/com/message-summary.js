'use strict'
var h = require('hyperscript')
var pull = require('pull-stream')
var mlib = require('ssb-msgs')
var com = require('./index')
var util = require('../lib/util')
var markdown = require('../lib/markdown')
var mentions = require('../lib/mentions')

function summaryStr (str) {
  str = util.escapePlain(str)
  if (str.length > 60)
    str = str.slice(0, 57) + '...'
  return str
}

function getSummary (app, msg) {
  try {
    var s = ({
      post: function () { return [com.icon('comment'), ' ', summaryStr(msg.value.content.text)] },
      advert: function () { return [com.icon('bullhorn'), ' ', summaryStr(msg.value.content.text)] },
      init: function () {
        return [com.icon('off'), ' New user: ', (app.names[msg.value.author] || msg.value.author)]
      },
      name: function () {
        return mlib.getLinks(msg.value.content, { tofeed: true, rel: 'names' })
          .map(function (l) { return [com.icon('tag'), ' ', (app.names[l.feed] || l.feed), ' is ', l.name] })
      },
      follow: function () {
        return mlib.getLinks(msg.value.content, { tofeed: true, rel: 'follows' })
          .map(function (l) { return [com.icon('plus'), ' Followed ', (app.names[l.feed] || l.feed)] })
          .concat(mlib.getLinks(msg.value.content, { tofeed: true, rel: 'unfollows' })
            .map(function (l) { return [com.icon('minus'), ' Unfollowed ', (app.names[l.feed] || l.feed)] }))
      },
      trust: function () { 
        return mlib.getLinks(msg.value.content, { tofeed: true, rel: 'trusts' })
          .map(function (l) {
            if (l.value > 0)
              return [com.icon('lock'), ' Trusted ', (app.names[l.feed] || l.feed)]
            if (l.value < 0)
              return [com.icon('flag'), ' Flagged ', (app.names[l.feed] || l.feed)]
            return 'Untrusted/Unflagged '+(app.names[l.feed] || l.feed)
          })
      },
    })[msg.value.content.type]()
    if (!s || s.length == 0)
      s = false
    return s
  } catch (e) { return '' }
}

var attachmentOpts = { toext: true, rel: 'attachment' }
module.exports = function (app, msg, opts) {

  var isExpanded = false

  // markup

  var content = getSummary(app, msg)
  /*if (msg.value.content.text && typeof msg.value.content.text == 'string') {
    content = msg.value.content.text
  } else {
    if (!opts || !opts.mustRender)
      return ''
    content = JSON.stringify(msg.value.content)
  }
  content = util.escapePlain(content)
  content = markdown.emojis(content)
  content = mentions.post(content, app, msg)

  // var len = noHtmlLen(content)
  // if (len > 60 || content.length > 512) {
  //   content = content.slice(0, Math.min(60 + (content.length - len), 512)) + '...'
  // }*/

  var replies = ''
  if (msg.numThreadReplies)
    replies = h('span', h('small.text-muted', com.icon('comment'), msg.numThreadReplies))

  var attachments = ''
  var numAttachments = mlib.getLinks(msg, attachmentOpts).length
  if (numAttachments)
    attachments = h('span', h('small.text-muted', com.icon('paperclip'), numAttachments))

  var depth = (opts && opts.depth) ? opts.depth * 20 : 0
  var treeExpander = h('span.tree-expander', { onclick: toggleChildren, style: 'padding-left: '+depth+'px' }, com.icon('triangle-right'))

  var name = app.names[msg.value.author] || util.shortString(msg.value.author)
  var nameConfidence = com.nameConfidence(msg.value.author, app)
  var msgSummary = h('tr.message-summary', { onclick: selectMsg },
    h('td', treeExpander, ' ', content || h('span.text-muted', msg.value.content.type)),
    // h('td', content),
    h('td', com.userlink(msg.value.author, name), nameConfidence),
    h('td', attachments),
    h('td', replies),
    h('td.text-muted', util.prettydate(new Date(msg.value.timestamp)))
  )
  return msgSummary

  // handlers

  function selectMsg (e) {
    // abort if clicked on a sub-link
    var el = e.target
    while (el) {
      if (el.tagName == 'A')
        return
      el = el.parentNode
    }

    e.preventDefault()
    ;[].forEach.call(document.querySelectorAll('.selected'), function (el) { el.classList.remove('selected') })
    this.classList.toggle('selected')
    //window.location.hash = '#/msg/'+msg.key
  }

  function toggleChildren (e) {
    e.preventDefault()
    e.stopPropagation()

    isExpanded = !isExpanded   

    var icon = treeExpander.firstChild
    if (isExpanded) {
      icon.classList.remove('glyphicon-triangle-right')
      icon.classList.add('glyphicon-triangle-bottom')

      var childOpts = { depth: (opts && opts.depth) ? opts.depth + 1 : 1, mustRender: (opts && opts.mustRender) }
      pull(app.ssb.messagesLinkedToMessage({ id: msg.key, keys: true }), pull.drain(function (childMsg) {
        msgSummary.parentNode.insertBefore(module.exports(app, childMsg, childOpts), msgSummary.nextSibling)
      }))
    } else {
      icon.classList.remove('glyphicon-triangle-right')
      icon.classList.add('glyphicon-triangle-bottom')
    }
  }
}

function noHtmlLen (str) {
  var entityLen = 0
  str.replace(/<.*>/g, function($0) {
    entityLen += $0.length
  })
  return str.length - entityLen
}