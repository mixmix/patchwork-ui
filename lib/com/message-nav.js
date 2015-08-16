'use strict'
var h = require('hyperscript')
var pull = require('pull-stream')
var paramap  = require('pull-paramap')
var mlib = require('ssb-msgs')
var schemas = require('ssb-msg-schemas')
var ssbref = require('ssb-ref')
var app = require('../app')
var ui = require('../ui')
var modals = require('../ui/modals')
var com = require('./index')
var u = require('../util')
var markdown = require('../markdown')
var mentions = require('../mentions')
var social = require('../social-graph')

module.exports = function (msg, opts) {

  // markup

  msg.plaintext = (typeof msg.value.content !== 'string')
  var msgEl = h('.message.nav'+(!msg.plaintext?'.secret':''),
    { onclick: (!(opts && opts.fullview) ? onopen(msg) : null) },
    h('.message-inner',
      h('.message-header',
        h('div', com.user(msg.value.author)),
        h('.favs', com.icon('star'), h('span.favcount', '0')),
        h('.replies', com.icon('comment'), h('span.replycount', '0')),
        h('.age', h('small', u.prettydate(new Date(msg.value.timestamp), true)))
      ),
      h('.message-body', (typeof msg.value.content != 'string') ? com.messageContent(msg, { summary: true }) : '')
    )
  )
  msg.el = msgEl // attach el to msg for the handler-funcs to access
  fetchState(msg, opts)

  // unread
  app.ssb.patchwork.isRead(msg.key, function (err, isread) {
    if (!err && !isread)
      msg.el.classList.add('unread')
  })

  // if encrypted, attempt to decrypt
  if (!msg.plaintext) {
    app.ssb.private.unbox(msg.value.content, function (err, decrypted) {
      if (decrypted) {
        msg.value.content = decrypted

        // render content
        var body = msgEl.querySelector('.message-body')
        body.innerHTML = ''
        body.appendChild(com.messageContent(msg, { summary: true }))
      }
    })
  }

  return msgEl
}

function onopen (msg) {
  return function (e) {
    // make sure this isnt a click on a link
    var node = e.target
    while (node && node !== msg.el) {
      if (node.tagName == 'A')
        return
      node = node.parentNode
    }

    e.preventDefault()
    e.stopPropagation()

    var root = mlib.link(msg.value.content.root || msg.value.content.flag)
    var key = root ? root.link : msg.key
    window.location = '#/msg/'+key
    // require('../ui/subwindows').message(key)
  }
}

var fetchState =
module.exports.fetchState = function (msg, opts) {
  // reply messages
  app.ssb.relatedMessages({ id: msg.key, count: true }, function (err, thread) {
    if (!thread || !thread.related) {
      if (opts && opts.markread)
        app.ssb.patchwork.markRead(msg.key)
      return
    }

    u.decryptThread(thread, function () {
      // handle votes, flags
      renderSignals(msg.el, thread)
    })
  })
}

function renderSignals (el, msg) {
  if (!msg || !msg.related)
    return

  // collect comments and votes
  var rids = {}, upvoters = {}, flaggers = {}, ncomments = 0
  msg.related.forEach(function (r) {
    if (rids[r.key]) return false // only appear once
    rids[r.key] = 1

    var c = r.value.content
    if (c.type === 'post') {
      ncomments++
    }
    else if (c.type === 'vote') {
      if (c.vote.value === 1)
        upvoters[r.value.author] = 1
      else
        delete upvoters[r.value.author]
    }
    else if (c.type == 'flag') {
      if (c.flag && c.flag.reason)
        flaggers[r.value.author] = c.flag.reason
      else
        delete flaggers[r.value.author]
    }
  })

  // update stats
  el.querySelector('.message-header .replycount').innerText = ncomments
  if (upvoters[app.user.id])
    el.querySelector('.message-header .favs').classList.add('faved')
  el.querySelector('.message-header .favcount').innerText = Object.keys(upvoters).length

  // handle flags
  el.classList.remove('flagged-nsfw', 'flagged-spam', 'flagged-abuse')
  for (var k in flaggers) {
    // use the flag if we dont follow the author, or if we follow the flagger
    // (that is, dont use flags by strangers on people we follow)
    if (k == app.user.id || !social.follows(app.user.id, msg.value.author) || social.follows(app.user.id, k))
      el.classList.add('flagged-'+flaggers[k])
  }
}

function isFlagUndone (r) {
  if (r.related) {
    return r.related.filter(function (msg) {
      var c = msg.value.content
      return (mlib.link(c.redacts) && mlib.link(c.redacts).link == r.key)
    }).length > 0
  }
  return false
}
