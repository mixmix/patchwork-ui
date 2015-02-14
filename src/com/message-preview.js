'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var com = require('./index')
var util = require('../lib/util')
var markdown = require('../lib/markdown')
var mentions = require('../lib/mentions')

module.exports = function (app, msg, opts) {

  // markup

  var refsStr = ''
  if (msg.numThreadReplies == 1) refsStr = ', 1 reference'
  if (msg.numThreadReplies > 1) refsStr = ', '+msg.numThreadReplies+' refs'

  /*var msgfooter
  var attachments = mlib.getLinks(msg.value.content, attachmentOpts)
  if (attachments.length) {
    msgfooter = h('.panel-footer',
      h('ul', attachments.map(function (link) {
        var url = '#/ext/'+link.ext
        if (link.name)
          url += '?name='+encodeURIComponent(link.name)+'&msg='+encodeURIComponent(msg.key)
        return h('li', h('a', { href: url }, link.name || util.shortString(link.ext)))
      }))
    )
  }*/

  var content
  if (msg.value.content.type == 'post') {
    content = h('div', { innerHTML: mentions.post(markdown.block(msg.value.content.text), app, msg) })
  } else {
    content = com.message.raw(app, msg)
  }

  return h('.message-preview',
    h('.value',
      h('ul.headers.list-inline',
        h('li', com.a('#/msg/'+msg.key, com.icon('new-window'), { target: '_blank' })),
        h('li', h('small', 'by '), com.userlink(msg.value.author, app.names[msg.value.author]), com.nameConfidence(msg.value.author, app)),
        h('li', h('small', 'type '), com.a('#/', msg.value.content.type)),
        h('li', h('small', 'from '), com.a('#/', util.prettydate(new Date(msg.value.timestamp), true)+refsStr, { title: 'View message thread' }))),
      h('.content', content)))
}