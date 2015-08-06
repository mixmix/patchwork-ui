'use strict'
var h = require('hyperscript')
var pull = require('pull-stream')
var paramap  = require('pull-paramap')
var mlib = require('ssb-msgs')
var schemas = require('ssb-msg-schemas')
var ssbref = require('ssb-ref')
var multicb = require('multicb')
var app = require('../app')
var ui = require('../ui')
var com = require('./index')
var u = require('../util')
var markdown = require('../markdown')
var mentions = require('../mentions')
var social = require('../social-graph')

function shorten (str, n) {
  n = n || 120
  if (str.length > n)
    str = str.slice(0, n-3) + '...'
  return str
}

function getContent (msg) {
  var c = msg.value.content

  function md (str) {
    return h('.markdown', { innerHTML: mentions.post(markdown.block(str), msg) })
  }
  try {
    var s = ({
      post: function () { 
        if (!c.text) return
        var recps = mlib.links(c.recps).map(function (r, n) { 
          var user = com.user(r.link, { thin: true })
          user[0].querySelector('.user-link').style.color = '#777'
          if (n < c.recps.length-1)
            return [user, ', ']
          return user
        })
        if (recps && recps.length)
          return h('div', h('p', 'To: ', recps), md(c.text))
        return md(c.text)
      },
      contact: function () {
        var subjects = mlib.links(c.contact).map(function (l) {
          if (l.link === msg.value.author)
            return 'self'
          return com.user(l.link)
        })
        if (!subjects.length) return

        if (c.following === true)
          return h('h4', com.icon('user'), ' Followed ', subjects)
        if (c.blocking === true)
          return h('h4', com.icon(''), ' Blocked ', subjects)
        if (c.following === false)
          return h('h4', com.icon('minus'), ' Unfollowed ', subjects)
        if (c.blocking === false)
          return h('h4', com.icon('erase'), ' Unblocked ', subjects)
      },
      about: function () {
        var about = mlib.link(c.about)
        if (about.link == msg.value.author) {
          if (c.image && c.name)
            return h('h4', 'Set their image, and changed their name to ', c.name)
          if (c.image)
            return h('h4', 'Set their image')
          if (c.name)
            return h('h4', 'Changed their name to ', c.name)
        } else {
          if (c.name)
            return h('h4', 'Set ', com.user(about.link), '\'s name to ', c.name)
        }
      },
      vote: function () {
        var items
        var vote = mlib.link(c.vote)
        if (!vote)
          return

        if (vote.value > 0)
          items = [com.icon('star'), ' Starred ']
        else if (vote.value <= 0)
          items = [com.icon('erase'), ' Unstarred ']

        if (ssbref.isMsgId(vote.link))
          items.push(fetchMsgLink(vote.link))
        else if (ssbref.isFeedId(vote.link))
          items.push(com.user(vote.link))
        else if (ssbref.isBlobId(vote.link))
          items.push(com.a('#/webiew/'+vote.link, 'this file'))

        return items
      },
      flag: function () { 
        var del
        var flag = mlib.link(c.flag)
        if (!flag)
          return
        if (app.user.id == msg.value.author) {
          del = h('a.text-danger', { href: '#', onclick: onunflag, title: 'Remove this flag' }, h('small', com.icon('trash')))
          function onunflag (e) {
            e.preventDefault()
            var p = del.parentNode
            p.innerHTML = '<em>Flag removed</em>'
            p.classList.remove('text-danger')
            p.classList.add('text-muted')

            // publish unflag
            app.ssb.publish(schemas.unflag(mlib.link(c.flag).link, msg.key), function (err, flagmsg) {
              if (err) {
                console.error(err)
                swal('Error While Publishing', err.message, 'error')
              }
            })
          }
        }

        if (ssbref.isFeedId(flag.link)) {
          var target = com.userlink(flag.link)
          if (!flag.reason)
            return h('h4.text-danger', com.icon('erase'), ' Unflagged ', target)
          if (typeof flag.reason == 'string')
            return h('h4.text-danger', com.icon('flag'), ' Flagged ', target, ' as ', h('span.label.label-danger', flag.reason))
          return h('h4.text-danger', com.icon('flag'), ' Flagged ', target)
        } else {
          if (!flag.reason)
            return h('p.text-danger', com.icon('erase'), ' Unflagged ', target)
          if (typeof flag.reason == 'string')
            return h('p.text-danger', com.icon('flag'), ' ', h('span.label.label-danger', flag.reason), ' ', target, ' ', del)
          return h('p.text-danger', com.icon('flag'), ' Flagged ', target, ' ', del)
        }
      },
      pub: function () {
        var pub = mlib.link(c.pub)
        if (pub)
          return h('h4', com.icon('cloud'), ' Announced a public peer: ', com.user(pub.link), ' at ', pub.host, ':', pub.port)
      }
    })[c.type]()
    if (!s || s.length == 0)
      s = false
  } catch (e) {console.log(e)}

  if (!s)
    s = h('table.raw', com.prettyRaw.table(msg.value.content))

  return s
}

module.exports = function (msg, opts) {

  // markup

  var msgEl
  var msgComments = h('.message-comments')
  var favoriteBtn
  if (typeof msg.value.content == 'string') {
    // encrypted
    var encryptedLabel = h('span')
    msgEl = h('.message.encrypted',
      h('ul.message-ctrls.list-inline',
        h('li', com.a('#/msg/'+msg.key, u.prettydate(new Date(msg.value.timestamp), true))),
        h('li', com.a('#/msg/'+msg.key, 'permalink')),
        (!opts || !opts.fullview) ? h('li', h('a', { href: '#', onclick: onreply, title: 'Reply to this post' }, 'reply')) : '',
        h('li.pull-right', h('a', { href: '#', onclick: onflag, title: 'Flag this post' }, com.icon('flag')))
      ),
      com.userImg(msg.value.author),
      h('.message-inner',
        h('ul.message-header.list-inline',
          h('li', com.user(msg.value.author)),
          h('li.pull-right.encrypted-label', h('code', { style: 'font-size: 18px' }, encryptedLabel, ' ', com.icon('lock')))
        ),
        h('.message-body', h('p', 'Decrypting...')),
        msgComments
      )
    )

    // create the encrypted-label animation
    var eln = 1
    var elt1 = 'Secret message'
    var elt2 = btoa(elt1)
    encryptedLabel.innerText = elt2.slice(0, elt1.length)
    setTimeout(function () {
      var eli = setInterval(function () {
        encryptedLabel.innerText = elt1.slice(0, eln) + elt2.slice(eln, elt1.length)
        eln++
        if (eln > elt1.length)
          clearInterval(eli)
      }, 33)
    }, 500)

    // try to decrypt
    app.ssb.private.unbox(msg.value.content, function (err, decrypted) {
      if (decrypted) {
        msg.value.content = decrypted

        // render content
        var body = msgEl.querySelector('.message-body')
        body.innerHTML = ''
        body.appendChild(getContent(msg, opts))
      }
    })    
    fetchStateEncrypted(msgEl, msg.key, opts)
  } else {
    // plaintext
    favoriteBtn = h('a', { href: '#', onclick: onfavorite, title: 'Favorite this post' }, com.icon('star'))
    msgEl = h('.message',
      h('ul.message-ctrls.list-inline',
        h('li', com.a('#/msg/'+msg.key, u.prettydate(new Date(msg.value.timestamp), true))),
        (!opts || !opts.fullview) ? h('li', h('a', { href: '#', onclick: onreply, title: 'Reply to this post' }, 'reply')) : '',
        h('li.pull-right', h('a', { href: '#', onclick: onflag, title: 'Flag this post' }, com.icon('flag')))
      ),
      com.userImg(msg.value.author),
      h('.message-inner',
        h('ul.message-header.list-inline',
          h('li', com.user(msg.value.author)),
          h('li.favorite.pull-right', h('span.users'), favoriteBtn)
        ),
        h('.message-body', getContent(msg, opts)),
        msgComments
      )
    )
    fetchStatePlaintext(msgEl, msg.key, opts)
  }
  
  // add reply form for fullview  
  if (opts && opts.fullview) 
    msgEl.querySelector('.message-inner').appendChild(com.postForm(msg, { rows: 5, placeholder: 'Write your reply', noheader: true, onpost: onfullviewpost }))

  return msgEl

  // handlers

  function onfullviewpost () {
    ui.refreshPage()
  }

  function onreply (e) {
    e.preventDefault()
    var replyForm

    function onpostreply (comment) {
      replyForm.parentNode.removeChild(replyForm)
      var cdiv = h('.comment',
        com.userImg(comment.value.author),
        h('.comment-inner', getContent(comment)))
      msgEl.querySelector('.message-comments').appendChild(cdiv)
    }

    if (!msgEl.querySelector('.reply-form')) {
      replyForm = com.postForm(msg, { onpost: onpostreply, rows: 5, placeholder: 'Write your reply' })
      msgEl.querySelector('.message-inner').appendChild(replyForm)
    }
  }

  function onflag (e) {
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
          msgEl.querySelector('.message-comments').appendChild(h('.comment',
            com.userImg(flagmsg.value.author),
            h('.comment-inner', getContent(flagmsg))
          ))
        }
      })
    })
  }

  var voting = false
  function onfavorite (e) {
    e.preventDefault()
    e.stopPropagation()
    if (voting)
      return // wait please
    voting = true

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
        var users = msgEl.querySelector('.message-header .favorite .users')
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

function updateFavBtn (el, b) {
  if (b)
    el.classList.add('selected')
  else
    el.classList.remove('selected')
  el.setAttribute('title', b ? 'Unfavorite this post' : 'Favorite this post')
}

var fetchStatePlaintext =
module.exports.fetchStatePlaintext = function (el, mid, opts) {
  mid = mid || el.dataset.msg
  if (!mid) return
  app.ssb.relatedMessages({ id: mid, count: true }, function (err, thread) {
    if (!thread) return

    // collect comments and votes
    var comments = []
    var upvoters = {}, flaggers = {}
    ;(thread.related||comments).forEach(function (r) {
      var c = r.value.content
      if (c.type === 'vote') {
        if (c.vote.value === 1)
          upvoters[r.value.author] = 1
        else
          delete upvoters[r.value.author]
      }
      else if (c.type == 'flag') {
        if (c.flag && c.flag.reason) {
          if (!isFlagUndone(r))
            comments.push(r)
          flaggers[r.value.author] = c.flag.reason
        } else
          delete flaggers[r.value.author]
      }
      else if (c.type == 'post') {
        comments.push(r)
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

    // render comments btn
    el.querySelector('.message-comments').innerHTML = ''
    if (opts && opts.fullview)
      renderComments()
    else if (comments.length)
      el.querySelector('.message-inner').appendChild(h('.load-comments', h('a', { href: '#', onclick: renderComments }, 'Show ' + comments.length + ' comment' + (comments.length!=1?'s':''))))
    function renderComments (e) {
      e && e.preventDefault()
      el.querySelector('.message-comments').innerHTML = ''
      comments.forEach(function (comment) {
        var cdiv = h('.comment',
          com.userImg(comment.value.author),
          h('.comment-inner', getContent(comment)))
        el.querySelector('.message-comments').appendChild(cdiv)
      })
      try { el.querySelector('.message-inner').removeChild(el.querySelector('.load-comments')) }
      catch (e) {}
    }

    // mark read
    if (opts && opts.markread) {
      var ids = [thread.key].concat(comments.map(function (c) { return c.key }))
      app.ssb.patchwork.markRead(ids)
    }

  })
}

var fetchStateEncrypted =
module.exports.fetchStateEncrypted = function (el, mid, opts) {
  mid = mid || el.dataset.msg
  if (!mid) return
  pull(
    app.ssb.links({ type: 'msg', dest: mid, rel: 'repliesTo', keys: true, values: true, reverse: true }),
    paramap(function (msg, cb) {
      if (typeof msg.value.content != 'string') {
        // woah, not encrypted!
        msg.plaintext = true
        return cb(null, msg)
      }

      // decrypt
      app.ssb.private.unbox(msg.value.content, function (err, decrypted) {
        if (decrypted)
          msg.value.content = decrypted
        cb(null, msg)
      })
    }),
    pull.collect(render)
  )

  function render (err, comments) {
    comments = comments.filter(function (c) { return c.value.content.type == 'post' })

    // render comments
    el.querySelector('.message-comments').innerHTML = ''
    comments.forEach(function (c) {
      var cdiv = h('.comment',
        com.userImg(c.value.author),
        h('.comment-inner', 
          c.plaintext ?
            h('em.text-danger.pull-right', 'Warning: This comment was not encrypted!') :
            h('span.pull-right', com.icon('lock')),
          getContent(c)
        )
      )
      el.querySelector('.message-comments').appendChild(cdiv)
    })

    // mark read
    if (opts && opts.markread) {
      var ids = [mid].concat(comments.map(function (c) { return c.key }))
      app.ssb.patchwork.markRead(ids)
    }

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

function ago (msg) {
  var str = u.prettydate(new Date(msg.value.timestamp))
  if (str === 'yesterday')
    str = '1d'
  return h('small.text-muted', str, ' ago')
}

function fetchMsgLink (mid) {
  var link = com.a('#/msg/'+mid, 'this post')
  var linkspan = h('span', link)
  app.ssb.get(mid, function (err, msg) {
    if (msg) {
      linkspan.insertBefore(h('span', (msg.author == app.user.id) ? 'your ' : com.userName(msg.author) + '\'s', ' post'), link)
      link.style.display = 'block'
      link.style.padding = '8px 0'
      link.style.color = 'gray'
      link.textContent = link.innerText = shorten((msg.content.type == 'post') ? msg.content.text : msg.content.type, 255)
    }
  })
  return linkspan
}