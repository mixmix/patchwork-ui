'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var com = require('./index')
var util = require('../lib/util')
var markdown = require('../lib/markdown')
var mentions = require('../lib/mentions')

var attachmentOpts = { toext: true, rel: 'attachment' }
module.exports = function (app, msg, opts) {

  // markup

  var content, isRaw
  if (msg.value.content.text && typeof msg.value.content.text == 'string') {
    content = msg.value.content.text
  } else {
    if (!opts || !opts.mustRender)
      return ''
    content = JSON.stringify(msg.value.content)
    isRaw = true
  }
  content = util.escapePlain(content)
  content = markdown.emojis(content)
  content = mentions.post(content, app, msg)

  var len = noHtmlLen(content)
  if (len > 60 || content.length > 512) {
    content = content.slice(0, Math.min(60 + (content.length - len), 512)) + '...'
  }

  var replies = ''
  if (msg.numThreadReplies)
    replies = h('span', h('small.text-muted', com.icon('comment'), msg.numThreadReplies))

  var attachments = ''
  var numAttachments = mlib.getLinks(msg, attachmentOpts).length
  if (numAttachments)
    attachments = h('span', h('small.text-muted', com.icon('paperclip'), numAttachments))

  var name = app.names[msg.value.author] || util.shortString(msg.value.author)
  var nameConfidence = com.nameConfidence(msg.value.author, app)
  return h('tr.message-summary', { onclick: selectMsg, ondblclick: openMsg },
    h('td.text-right', com.userlink(msg.value.author, name), nameConfidence),
    h('td', msg.value.content.type),
    h('td', h('span' + (isRaw ? '' : ''), { innerHTML: content })),
    h('td', attachments),
    h('td', replies),
    h('td.text-muted', util.prettydate(new Date(msg.value.timestamp)))
  )

  // handlers

  function selectMsg (e) {
    e.preventDefault()
    var was = this.classList.contains('selected')
    if (!e.metaKey)
      Array.prototype.forEach.call(this.parentNode.querySelectorAll('.selected'), function (el) { el.classList.remove('selected') })
    if (was)
      this.classList.remove('selected')
    else
      this.classList.add('selected')
  }

  function openMsg (e) {
    e.preventDefault()
    window.location.hash = '#/msg/'+msg.key
  }
}

function noHtmlLen (str) {
  var entityLen = 0
  str.replace(/<.*>/g, function($0) {
    entityLen += $0.length
  })
  return str.length - entityLen
}