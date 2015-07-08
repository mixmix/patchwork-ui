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

  var summary = getSummary(app, msg, opts)
  if (!summary)
    return

  var msgOneline = h('.message-oneline',
    h('.message-oneline-column', com.userImg(app, msg.value.author)),
    h('.message-oneline-column', com.user(app, msg.value.author)),
    h('.message-oneline-column', summary),
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