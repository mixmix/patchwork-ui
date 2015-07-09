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
      mail: function () {
        return com.a('#/msg/'+msg.key, [c.subject||'(No Subject)', ' ', h('span.text-muted', c.body)])
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
  } catch (e) { }

  if (!s)
    s = h('div', JSON.stringify(msg.value.content))
  return s
}

module.exports = function (app, msg, opts) {

  // markup

  var content
  if (typeof msg.value.content == 'string') {
    // encrypted message, try to decrypt
    content = h('div')
    app.ssb.unbox(msg.value.content, function (err, decrypted) {
      if (decrypted) {
        // success, render content
        msg.value.content = decrypted
        var col = content.parentNode
        col.removeChild(content)
        col.appendChild(getSummary(app, msg, opts))

        // update recipients
        if (decrypted.recps && Array.isArray(decrypted.recps)) {
          col = msgOneline.querySelector('.message-oneline-column:nth-child(2)')
          decrypted.recps.forEach(function (recp) {
            if (recp.feed && recp.feed != msg.value.author) {
              col.appendChild(h('span', ', ', com.user(app, recp.feed)))
            }
          })
        }
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