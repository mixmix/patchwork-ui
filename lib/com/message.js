'use strict'
var h = require('hyperscript')
var pull = require('pull-stream')
var paramap  = require('pull-paramap')
var mlib = require('ssb-msgs')
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
      init: function () {
        return h('h4', com.icon('off'), ' Created account.')
      },
      post: function () { 
        if (!c.text) return
        return md(c.text)
      },
      mail: function () {
        if (!c.body) return
        var recps = c.recps.map(function (r, n) { 
          var user = com.user(r.feed, { thin: true })
          user[0].querySelector('.user-link').style.color = '#777'
          if (n < c.recps.length-1)
            return [user, ', ']
          return user
        })
        var b = md(c.body)
        b.style.padding = '15px'
        b.style.background = '#fafafa'
        return h('div', { style: 'margin-top: -5px' },
          (c.subject) ? h('h3', { style: 'margin: 0; border-bottom: 1px solid #ccc' }, c.subject) : '',
          h('p.text-muted', 'To ', recps),
          b
        )
      },
      flag: function () { 
        var del
        if (c.flag && app.user.id == msg.value.author) {
          del = h('a.text-danger', { href: '#', onclick: onunflag }, h('small', com.icon('trash')))
          function onunflag (e) {
            e.preventDefault()
            var p = del.parentNode
            p.innerHTML = '<em>Flag removed</em>'
            p.classList.remove('text-danger')
            p.classList.add('text-muted')

            // publish unflag
            app.ssb.publish({ type: 'flag', flagTopic: c.flagTopic, undoesFlag: { msg: msg.key }, flag: false }, function (err, flagmsg) {
              if (err) {
                console.error(err)
                swal('Error While Publishing', err.message, 'error')
              }
            })
          }
        }
        if (!c.flag)
          return h('p.text-danger', com.icon('erase'), ' Unflagged ', del)
        if (typeof c.flag == 'string')
          return h('p.text-danger', com.icon('flag'), ' ', h('span.label.label-danger', c.flag), ' ', del)
        return h('p.text-danger', com.icon('flag'), ' Flagged ', del)
      },
      fact: function () { 
        if (!c.text) return
        var subjects = mlib.asLinks(c.factAbout).map(function (l) {
          return com.user(l.feed)
        })
        if (!subjects.length) return
        var text = mentions.post(u.escapePlain(c.text), msg)
        return h('p', com.icon('info-sign'), ' ', subjects, ' ', h('span', { innerHTML: text }))
      },
      pub: function () {
        return h('h4', com.icon('cloud'), ' Announced a public peer at ', c.address)
      },
      contact: function () {
        var subjects = mlib.asLinks(c.contact).map(function (l) {
          if (l.feed === msg.value.author)
            return 'self'
          return com.user(l.feed)
        })
        if (!subjects.length) return

        var items = []
        if (c.following === true)
          items.push(h('h4', com.icon('user'), ' Followed ', subjects))
        if (c.following === false)
          items.push(h('h4', com.icon('minus'), ' Unfollowed ', subjects))

        if ('flagged' in c) {
          if (c.flagged) {
            if (c.flagged.reason && typeof c.flagged.reason == 'string')
              items.push(h('h4', com.icon('flag'), ' Flagged ', subjects, ': "', c.flagged.reason, '"'))
            else
              items.push(h('h4', com.icon('flag'), ' Flagged ', subjects))
          } else
            items.push(h('h4', com.icon('erase'), ' Unflagged ', subjects))
        }

        if (c.alias) {
          if (c.alias === 'primary')
            items.push(h('h4', com.icon('link'), ' Claimed to be a secondary feed owned by ', subjects))
          else if (c.alias === 'secondary')
            items.push(h('h4', com.icon('link'), ' Claimed ownership of ', subjects))
        }
        if ('alias' in c && !c.alias)
          items.push(h('h4', com.icon('erase'), ' Claimed no alias for ', subjects))

        if ('name' in c)
          items.push(h('h4', com.icon('tag'), ' Named ', subjects, ' ', c.name))

        if ('profilePic' in c)
          items.push(h('h4', com.icon('picture'), ' Set a profile pic for ', subjects))

        if (items.length===0)
          items.push(h('h4', com.icon('option-horizontal'), ' Published a contact for ', subjects))
        return items
      },
      vote: function () {
        var items
        if (c.vote == 1)
          items = [com.icon('star'), ' Starred ']
        else if (c.vote <= 0)
          items = [com.icon('erase'), ' Unstarred ']
        else
          return false

        if (!c.voteTopic)
          return false
        if (c.voteTopic.msg)
          items.push(fetchMsgLink(c.voteTopic.msg))
        else if (c.voteTopic.feed)
          items.push(com.user(c.voteTopic.feed))
        else if (c.voteTopic.ext)
          items.push(com.a('/ext/'+c.voteTopic.ext, 'this file'))
        else
          return false

        return items
      }
    })[c.type]()
    if (!s || s.length == 0)
      s = false
  } catch (e) {}

  if (!s)
    s = h('table.raw', com.prettyRaw.table(msg.value.content))

  return s
}

var attachmentOpts = { toext: true, rel: 'attachment' }
module.exports = function (msg, opts) {

  // markup

  var msgEl
  var msgComments = h('.message-comments')
  var favoriteBtn
  if (typeof msg.value.content == 'string') {
    // encrypted
    var encryptedLabel = h('span')
    msgEl = h('.message.encrypted',
      com.userImg(msg.value.author),
      h('ul.message-header.list-inline',
        h('li', com.user(msg.value.author)),
        h('li', com.a('#/msg/'+msg.key, u.prettydate(new Date(msg.value.timestamp), true))),
        (!opts || !opts.fullview) ? h('li', h('a', { href: '#', onclick: onreply }, 'reply')) : '',
        h('li.pull-right.encrypted-label', h('code', { style: 'font-size: 18px' }, encryptedLabel, ' ', com.icon('lock')))
      ),
      h('.message-body', h('p', 'Decrypting...')),
      msgComments
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
    app.ssb.unbox(msg.value.content, function (err, decrypted) {
      if (decrypted) {
        msg.value.content = decrypted

        // render content
        var body = msgEl.querySelector('.message-body')
        body.innerHTML = ''
        body.appendChild(getContent(msg, opts))

        // render attachments
        var a = com.messageAttachments(msg)
        if (a)
          msgEl.insertBefore(a, msgEl.querySelector('.message-comments'))
      }
    })    
    fetchStateEncrypted(msgEl, msg.key, opts)
  } else {
    // plaintext
    favoriteBtn = h('a', { href: '#', onclick: onfavorite, title: 'Favorite' }, com.icon('star'))
    msgEl = h('.message',
      com.userImg(msg.value.author),
      h('ul.message-header.list-inline',
        h('li', com.user(msg.value.author)),
        h('li', com.a('#/msg/'+msg.key, u.prettydate(new Date(msg.value.timestamp), true))),
        h('li', h('a', { href: '#', onclick: onflag }, com.icon('flag'))),
        (!opts || !opts.fullview) ? h('li', h('a', { href: '#', onclick: onreply }, 'reply')) : '',
        h('li.favorite.pull-right', h('span.users'), favoriteBtn)),
      h('.message-body', getContent(msg, opts)),
      com.messageAttachments(msg),
      msgComments
    )
    fetchStatePlaintext(msgEl, msg.key, opts)
  }
  
  // add reply form for fullview  
  if (opts && opts.fullview) 
    msgEl.appendChild(com.postForm(msg, { rows: 5, placeholder: 'Write your reply', noheader: true, onpost: onfullviewpost }))

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
      msgEl.appendChild(replyForm)
    }
  }

  function onflag (e) {
    e.preventDefault()
    ui.dropdown(e.target, [
      { value: 'nsfw',  label: 'NSFW' },
      { value: 'spam',  label: 'Spam' },
      { value: 'abuse', label: 'Abuse' }
    ], function (value) {
      if (!value) return
      // publish flag
      app.ssb.publish({ type: 'flag', flagTopic: { msg: msg.key }, flag: value }, function (err, flagmsg) {
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
    favoriteBtn.classList.toggle('selected') // optimistice ui update
    app.ssb.publish({ type: 'vote', voteTopic: { msg: msg.key }, vote: newvote }, function (err) {
      voting = false
      if (err) {
        favoriteBtn.classList.toggle('selected') // undo
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
        if (c.vote === 1)
          upvoters[r.value.author] = 1
        else
          delete upvoters[r.value.author]
      }
      else if (c.type == 'flag') {
        if (c.flag) {
          if (!isFlagUndone(r))
            comments.push(r)
          flaggers[r.value.author] = c.flag
        } else
          delete flaggers[r.value.author]
      }
      else if (c.type == 'post') {
        comments.push(r)
      }
    })

    // update vote ui
    if (upvoters[app.user.id])
      el.querySelector('.message-header .favorite a').classList.add('selected')
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

    // render comments
    el.querySelector('.message-comments').innerHTML = ''
    comments.forEach(function (comment) {
      var cdiv = h('.comment',
        com.userImg(comment.value.author),
        h('.comment-inner', getContent(comment)))
      el.querySelector('.message-comments').appendChild(cdiv)
    })

    // mark read
    if (opts && opts.markread) {
      var ids = [thread.key].concat(comments.map(function (c) { return c.key }))
      app.ssb.phoenix.markRead(ids)
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
      app.ssb.unbox(msg.value.content, function (err, decrypted) {
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
      app.ssb.phoenix.markRead(ids)
    }

  }
}

function isFlagUndone (r) {
  if (r.related) {
    return r.related.filter(function (msg) {
      var c = msg.value.content
      return (c.undoesFlag && c.undoesFlag.msg == r.key)
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