'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var com = require('./index')
var u = require('../lib/util')
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
        return h('div', h('div.markdown', { innerHTML: mentions.post(markdown.block(c.text), app, msg) }), getAttachments(app, msg))
      }
    })[c.type]()
  } catch (e) { }
}

function getAttachments (app, msg) {
  var els = []
  mlib.indexLinks(msg.value.content, { ext: true }, function (link, rel) {
    els.push([
      h('a',
        { href: '/ext/'+link.ext, target: '_blank' },
        com.icon('file'), ' ', link.name, ' ', h('small', (('size' in link) ? u.bytesHuman(link.size) : ''), ' ', link.type||'')),
      h('br')
    ])
  })
  return els
}

var statsOpts = { handlers: true }
var messageShell = function (app, msg, content, opts) {

  // markup 

  var msgbody = h('.panel-body', content, com.messageStats(app, msg, statsOpts))
  var msgpanel = h('.panel.panel-default.message',
    com.userHexagon(app, msg.value.author),
    h('.panel-heading',
      com.userlink(msg.value.author, app.users.names[msg.value.author]), com.nameConfidence(msg.value.author, app),
      ' ', com.a('#/msg/'+msg.key, u.prettydate(new Date(msg.value.timestamp), true), { title: 'View message thread' }),
      h('span', {innerHTML: ' &middot; '}), h('a', { title: 'Reply', href: '#', onclick: reply }, 'reply')
    ),
    msgbody
  )

  // handlers

  function reply (e) {
    e.preventDefault()

    if (!msgbody.nextSibling || !msgbody.nextSibling.classList || !msgbody.nextSibling.classList.contains('reply-form')) {
      var form = com.composer(app, msg)
      if (msgbody.nextSibling)
        msgbody.parentNode.insertBefore(form, msgbody.nextSibling)
      else
        msgbody.parentNode.appendChild(form)
    }
  }

  return msgpanel
}