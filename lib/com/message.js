'use strict'
var h = require('hyperscript')
var pull = require('pull-stream')
var paramap  = require('pull-paramap')
var mlib = require('ssb-msgs')
var schemas = require('ssb-msg-schemas')
var ssbref = require('ssb-ref')
var app = require('../app')
var ui = require('../ui')
var com = require('./index')
var u = require('../util')
var markdown = require('../markdown')
var mentions = require('../mentions')
var social = require('../social-graph')

module.exports = function (msg, opts) {

  // markup

  var msgComments = h('.message-comments')
  var msgEl = h('.message',
    com.userImg(msg.value.author),
    h('.message-inner',
      h('ul.message-header.list-inline',
        h('li', com.user(msg.value.author)),
        h('li', h('small', com.a('#/msg/'+msg.key, u.prettydate(new Date(msg.value.timestamp), true)))),
        h('li.pull-right', h('a', { href: '#', onclick: onflag(msg), title: 'Flag this post' }, com.icon('flag'))),
        h('li.favorite.pull-right',
          h('span.users'),
          h('a', { href: '#', onclick: onfavorite(msg), title: 'Favorite this post' }, com.icon('star'))
        )
      ),
      h('.message-body', com.messageContent(msg))
    ),
    msgComments,
    com.composer(msg, { onpost: onpostreply(msg) })
  )
  fetchState(msgEl, msg.key, opts)
  msg.el = msgEl // attach el to msg for the handler-funcs to access

  // if encrypted, attempt to decrypt
  if (typeof msg.value.content == 'string') {
    app.ssb.private.unbox(msg.value.content, function (err, decrypted) {
      if (decrypted) {
        msg.value.content = decrypted

        // render content
        var body = msgEl.querySelector('.message-body')
        body.innerHTML = ''
        body.appendChild(com.messageContent(msg))
      }
    })
  }

  return msgEl
}

function onpostreply (msg) {
  return function (comment) {
    if (typeof comment.value.content == 'string') // an encrypted message?
      ui.refreshPage() // easier just to refresh to page, for now
    else
      msg.el.querySelector('.message-comments').appendChild(renderComment(comment))
  }
}

function onfavorite (msg) {
  var voting = false
  return function (e) {
    e.preventDefault()
    e.stopPropagation()
    if (voting)
      return // wait please
    voting = true
    var favoriteBtn = this

    // get current state by checking if the control is selected
    // this won't always be the most recent info, but it will be close and harmless to get wrong,
    // plus it will reflect what the user expects to happen happening
    var wasSelected = favoriteBtn.classList.contains('selected')
    var newvote = (wasSelected) ? 0 : 1
    updateFavBtn(favoriteBtn, !wasSelected)
    app.ssb.publish(schemas.vote(msg.key, newvote), function (err) {
      voting = false
      if (err) {
        updateFavBtn(favoriteBtn, wasSelected) // undo
        console.error(err)
        swal('Error While Publishing', err.message, 'error')
      } else {
        // update ui
        var users = msg.el.querySelector('.message-header .favorite .users')
        if (newvote === 0) {
          try { users.removeChild(users.querySelector('.this-user')) } catch (e) {}
        } else {
          var userimg = com.userImg(app.user.id)
          userimg.classList.add('this-user')
          users.insertBefore(userimg, users.firstChild)
        }
      }
    })
  }
}

function onflag (msg) {
  return function (e) {
    e.preventDefault()
    e.stopPropagation()
    ui.dropdown(e.target, [
      { value: 'nsfw',  label: 'NSFW',  title: 'Graphic or adult content' },
      { value: 'spam',  label: 'Spam',  title: 'Off-topic or nonsensical' },
      { value: 'abuse', label: 'Abuse', title: 'Harrassment or needlessly derogatory' }
    ], function (value) {
      if (!value) return
      // publish flag
      app.ssb.publish(schemas.flag(msg.key, value), function (err, flagmsg) {
        if (err) {
          console.error(err)
          swal('Error While Publishing', err.message, 'error')
        } else {
          // render new flag
          msg.el.querySelector('.message-comments').appendChild(renderComment(flagmsg))
        }
      })
    })
  }
}

function updateFavBtn (el, b) {
  if (b)
    el.classList.add('selected')
  else
    el.classList.remove('selected')
  el.setAttribute('title', b ? 'Unfavorite this post' : 'Favorite this post')
}

var fetchState =
module.exports.fetchState = function (el, mid, opts) {
  mid = mid || el.dataset.msg
  if (!mid) return
  app.ssb.relatedMessages({ id: mid, count: true }, function (err, thread) {
    if (!thread || !thread.related) return

    u.decryptThread(thread, function () {

      // handle votes, flags
      renderSignals(el, thread)

      // render comments
      var comments = thread.related.filter(function (r) {
        var c = r.value.content
        if (c.type == 'flag' && c.flag && c.flag.reason && !isFlagUndone(r))
          return true // render a flag if it's still active
        return (c.type == 'post')
      })
      if (opts && opts.fullview)
        renderComments()
      else if (comments.length) {
        app.ssb.patchwork.markRead(thread.key) // go ahead and mark the root read
        el.appendChild(
          h('a.load-comments', { href: '#', onclick: renderComments }, 'Show ' + comments.length + ' comment' + (comments.length!=1?'s':'')),
          el.querySelector('.message-comments')
        )
      }
      function renderComments (e) {
        e && e.preventDefault()

        // render
        var commentsEl = el.querySelector('.message-comments')
        var existingCommentEl = commentsEl.firstChild
        comments.forEach(function (comment) {
          commentsEl.insertBefore(renderComment(comment), existingCommentEl)
        })
        try { el.removeChild(el.querySelector('.load-comments')) }
        catch (e) {}

        // mark read
        if (opts && opts.markread) {
          var ids = [thread.key].concat(comments.map(function (c) { return c.key }))
          app.ssb.patchwork.markRead(ids)
        }
      }
    })
  })
}

function renderComment (msg, encryptionNotice) {
  var el = h('.message',
    com.userImg(msg.value.author),
    h('.message-inner',
      h('ul.message-header.list-inline',
        h('li', com.user(msg.value.author)),
        h('li', h('small', com.a('#/msg/'+msg.key, u.prettydate(new Date(msg.value.timestamp), true)))),
        h('li.pull-right', h('a', { href: '#', onclick: onflag(msg), title: 'Flag this post' }, com.icon('flag'))),
        h('li.favorite.pull-right',
          h('span.users'),
          h('a', { href: '#', onclick: onfavorite(msg), title: 'Favorite this post' }, com.icon('star'))
        )
      ),
      h('.message-body',
        ((encryptionNotice) ?
          (msg.plaintext ?
            h('em.text-danger.pull-right', 'Warning: This comment was not encrypted!') :
            h('span.pull-right', com.icon('lock')))
          : ''),
        com.messageContent(msg)
      )
    )
  )
  msg.el = el // attach for handlers
  renderSignals(el, msg)

  return el
}

function renderSignals (el, msg) {
  if (!msg || !msg.related)
    return

  // collect comments and votes
  var upvoters = {}, flaggers = {}
  msg.related.forEach(function (r) {
    var c = r.value.content
    if (c.type === 'vote') {
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

  // update vote ui
  if (upvoters[app.user.id])
    updateFavBtn(el.querySelector('.message-header .favorite a'), true)
  upvoters = Object.keys(upvoters)
  var nupvoters = upvoters.length

  var favusers = el.querySelector('.message-header .favorite .users')
  favusers.innerHTML = ''
  upvoters.slice(0, 5).forEach(function (id) {
    var userimg = com.userImg(id)
    favusers.appendChild(userimg)
  })
  if (nupvoters > 5)
    favusers.appendChild(h('span', '+', nupvoters-5))

  // handle flags
  el.classList.remove('flagged-nsfw', 'flagged-spam', 'flagged-abuse')
  for (var k in flaggers) {
    // use the flag if we dont follow the author, or if we follow the flagger
    // (that is, dont use flags by strangers on people we follow)
    if (k == app.user.id || !social.follows(app.user.id, thread.value.author) || social.follows(app.user.id, k))
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