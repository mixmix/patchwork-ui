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
    if (!content)
      content = h('table', com.prettyRaw.table(app, msg.value.content))
  }    
  return messageShell(app, msg, content, opts)
}

function getContent (app, msg, opts) {
  var c = msg.value.content

  // check the component registry
  var renderer = app.get('msg-reply', { type: c.type })
  if (renderer) {
    try {
      var el = renderer.fn(msg)
      if (el)
        return el
    } catch (e) {
      console.error('Error rendering type: '+c.type, renderer, msg, e)
    }
  }
  
  // fallback to default behaviors
  try {
    return ({
      post: function () { 
        if (!c.text) return
        return h('div', h('div.markdown', { innerHTML: mentions.post(markdown.block(c.text), app, msg) }))
      }
    })[c.type]()
  } catch (e) { }
}

var statsOpts = { handlers: true }
var messageShell = function (app, msg, content, opts) {

  // markup 

  var msgbody = h('.panel-body', content, com.messageAttachments(app, msg), com.messageStats(app, msg, statsOpts))
  var msgpanel = h('.panel.panel-default.message',
    com.userHexagon(app, msg.value.author),
    h('.panel-heading',
      h('ul.list-inline',
        h('li', com.userlink(msg.value.author, app.users.names[msg.value.author]), com.nameConfidence(msg.value.author, app)),
        h('li', com.a('#/msg/'+msg.key, u.prettydate(new Date(msg.value.timestamp), true), { title: 'View message msg' })),
        h('li', h('a', { title: 'Reply', href: '#', onclick: onreply }, 'reply')),
        h('li.pull-right', h('a', { href: '/msg/'+msg.key, target: '_blank' }, 'as JSON')))),
    msgbody
  )

  return msgpanel

  // handlers

  function onreply (e) {
    e.preventDefault()

    if (!msgbody.nextSibling || !msgbody.nextSibling.classList || !msgbody.nextSibling.classList.contains('reply')) {
      var form = com.composer(app, msg, { onpost: opts && opts.onpost })
      if (msgbody.nextSibling)
        msgbody.parentNode.insertBefore(form, msgbody.nextSibling)
      else
        msgbody.parentNode.appendChild(form)
    }
  }
}