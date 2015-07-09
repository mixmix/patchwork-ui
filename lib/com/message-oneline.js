'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var com = require('./index')
var u = require('../util')

function getSummary (app, msg) {
  var c = msg.value.content

  try {
    var s = ({
      post: function () { 
        if (!c.text) return
        if (mlib.link(c.repliesTo, 'msg'))
          return com.a('#/msg/'+mlib.link(c.repliesTo).msg, c.text)
        return com.a('#/msg/'+msg.key, c.text)
      },
      flag: function () {
        if (!mlib.link(c.flagTopic, 'msg'))
          return
        if (c.flag)
          return com.a('#/msg/'+mlib.link(c.flagTopic).msg, h('span.text-danger', com.icon('flag'), ' Flagged your post ', h('span.label.label-danger', c.flag)))
        else
          return com.a('#/msg/'+mlib.link(c.flagTopic).msg, h('span.text-danger', com.icon('erase'), ' Unflagged your post'))
      }
    })[c.type]()
    if (!s || s.length == 0)
      s = false
    return s
  } catch (e) { return '' }
}

module.exports = function (app, msg, opts) {

  // markup

  var content
  if (typeof msg.value.content == 'string') {
    // encrypted message, try to decrypt
    content = h('div', h('code', 'This message is encrypted: ', msg.value.content))
    app.ssb.unbox(msg.value.content, function (err, decrypted) {
      if (decrypted) {
        // success, render content
        msg.value.content = decrypted
        content.innerHTML = ''
        content.appendChild(getSummary(app, msg, opts))
      }
    })
  } else
    content = getSummary(app, msg, opts)
  if (!content)
    return

  var msgOneline = h('.message-oneline',
    h('.message-oneline-column', com.userImg(app, msg.value.author)),
    h('.message-oneline-column', com.user(app, msg.value.author)),
    h('.message-oneline-column', content),
    h('.message-oneline-column', ago(msg))
  )

  app.ssb.phoenix.isRead(msg.key, function (err, isread) {
    if (!err && !isread)
      msgOneline.classList.add('unread')
  })

  return msgOneline
}

function ago (msg) {
  var str = u.prettydate(new Date(msg.value.timestamp))
  if (str == 'yesterday')
    str = '1d'
  return h('small.text-muted', str, ' ago')
}