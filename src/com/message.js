'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var com = require('./index')
var util = require('../lib/util')
var markdown = require('../lib/markdown')
var mentions = require('../lib/mentions')

var message =
module.exports = function (app, msg, opts) {
  var content
  if (opts && opts.raw) {
    content = h('table', com.prettyRaw.table(app, msg.value.content))
  } else {
    content = getContent(app, msg, opts)
    if (!content) {
      if (!(opts && opts.mustRender))
        return ''
      content = h('table', com.prettyRaw.table(app, msg.value.content))
    }
  }    
  return messageShell(app, msg, content, opts)
}

function getContent (app, msg, opts) {
  var c = msg.value.content
  try {
    return ({
      post: function () { 
        if (!c.text) return
        return h('div', { innerHTML: mentions.post(markdown.block(c.text), app, msg) })
      }
    })[c.type]()
  } catch (e) {}
}

var attachmentOpts = { toext: true, rel: 'attachment' }
var messageShell = function (app, msg, content, opts) {

  // markup 

  var msgfooter
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
  }

  var msgbody = h('.panel-body', content)
  var msgpanel = h('.panel.panel-default.message',
    h('.panel-heading',
      com.userlink(msg.value.author, app.names[msg.value.author]), com.nameConfidence(msg.value.author, app),
      ' ', com.a('#/msg/'+msg.key, util.prettydate(new Date(msg.value.timestamp), true), { title: 'View message thread' }),
      h('span', {innerHTML: ' &middot; '}), h('a', { title: 'Reply', href: '#', onclick: reply }, 'reply')
    ),
    msgbody,
    msgfooter
  )

  // handlers

  function reply (e) {
    e.preventDefault()

    if (!msgbody.nextSibling || !msgbody.nextSibling.classList || !msgbody.nextSibling.classList.contains('reply-form')) {
      var form = com.postForm(app, msg.key)
      if (msgbody.nextSibling)
        msgbody.parentNode.insertBefore(form, msgbody.nextSibling)
      else
        msgbody.parentNode.appendChild(form)
    }
  }

  return msgpanel
}