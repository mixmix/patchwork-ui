'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var com = require('./index')
var u = require('../lib/util')
var markdown = require('../lib/markdown')
var mentions = require('../lib/mentions')

function getContent (app, msg) {
  var c = msg.value.content

  try {
    return ({
      post: function () { 
        if (!c.text) return
        return h('.markdown', { innerHTML: mentions.post(markdown.block(c.text), app, msg) })
      }
    })[c.type]()
  } catch (e) { }
}

var message =
module.exports = function (app, msg, opts) {

  // markup

  var content = getContent(app, msg) || h('table', com.prettyRaw.table(app, msg.value.content))
  var msgbody = h('.message-body', content)
  return h('.message',
    com.userImg(app, msg.value.author),
    h('ul.message-header.list-inline',
      h('li', com.user(app, msg.value.author)),
      h('li', com.a('#/msg/'+msg.key, u.prettydate(new Date(msg.value.timestamp), true), { title: 'View message' })),
      h('li', h('a', { href: '#', onclick: onreply }, 'reply'))),
    msgbody,
    com.messageAttachments(app, msg)
    // com.messageStats(app, thread, statsOpts)
  )

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