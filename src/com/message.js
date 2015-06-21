'use strict'
var h = require('hyperscript')
var pull = require('pull-stream')
var mlib = require('ssb-msgs')
var multicb = require('multicb')
var com = require('./index')
var u = require('../lib/util')
var markdown = require('../lib/markdown')
var mentions = require('../lib/mentions')

function shorten (str, n) {
  n = n || 120
  if (str.length > n)
    str = str.slice(0, n-3) + '...'
  return str
}

function getSummary (app, msg) {
  var c = msg.value.content

  function md (str) {
    return h('.markdown', { innerHTML: mentions.post(markdown.block(str), app, msg) })
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
      fact: function () { 
        if (!c.text) return
        var subjects = mlib.asLinks(c.factAbout).map(function (l) {
          return com.user(app, l.feed)
        })
        if (!subjects.length) return
        var text = mentions.post(u.escapePlain(c.text), app, msg)
        return h('p', com.icon('info-sign'), ' ', subjects, ' ', h('span', { innerHTML: text }))
      },
      pub: function () {
        return h('h4', com.icon('cloud'), ' Announced a public peer at ', c.address)
      },
      contact: function () {
        var subjects = mlib.asLinks(c.contact).map(function (l) {
          if (l.feed === msg.value.author)
            return 'self'
          return com.user(app, l.feed)
        })
        if (!subjects.length) return

        var items = []
        if (c.following === true)
          items.push(h('h4', com.icon('user'), ' Followed ', subjects))
        if (c.following === false)
          items.push(h('h4', com.icon('minus'), ' Unfollowed ', subjects))

        if ('trust' in c) {
          var t = +c.trust|0
          if (t === 1)
            items.push(h('h4', com.icon('lock'), ' Trusted ', subjects))
          else if (t === -1)
            items.push(h('h4', com.icon('flag'), ' Flagged ', subjects))
          else if (t === 0)
            items.push(h('h4', com.icon('erase'), ' Untrusted/Unflagged ', subjects))
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
          items.push(fetchMsgLink(app, c.voteTopic.msg))
        else if (c.voteTopic.feed)
          items.push(com.user(app, c.voteTopic.feed))
        else if (c.voteTopic.ext)
          items.push(com.a('/ext/'+c.voteTopic.ext, 'this file'))
        else
          return false

        return items
      }
    })[c.type]()
    if (!s || s.length == 0)
      s = false
    return s
  } catch (e) { return '' }
}

var attachmentOpts = { toext: true, rel: 'attachment' }
module.exports = function (app, msg, opts) {

  // markup

  var content = getSummary(app, msg, opts)
  if (!content)
    content = h('table.raw', com.prettyRaw.table(app, msg.value.content))

  var msgComments = h('.message-comments')
  var favoriteBtn = h('a', { href: '#', onclick: onfavorite, title: 'Favorite' }, com.icon('star'))
  var msgSummary = h('.message',
    com.userImg(app, msg.value.author),
    h('ul.message-header.list-inline',
      h('li', com.user(app, msg.value.author)),
      h('li', com.a('#/msg/'+msg.key, u.prettydate(new Date(msg.value.timestamp), true))),
      h('li', h('a', { href: '#', onclick: onreply }, 'reply')),
      h('li.favorite.pull-right', h('span.users'), favoriteBtn)),
    h('.message-body', content),
    com.messageAttachments(app, msg),
    msgComments
  )

  fetchRowState(app, msgSummary, msg.key)
  return msgSummary

  // handlers

  function onreply (e) {
    e.preventDefault()
    var replyForm

    function onpostreply (comment) {
      replyForm.parentNode.removeChild(replyForm)
      var cdiv = h('.comment',
        com.userImg(app, comment.value.author),
        h('.comment-inner', getSummary(app, comment)))
      msgSummary.querySelector('.message-comments').appendChild(cdiv)
    }

    if (!msgComments.previousSibling.classList.contains('reply')) {
      replyForm = h('.composer.reply', com.postForm(app, msg, { onpost: onpostreply, rows: 5 }))   
      msgSummary.insertBefore(replyForm, msgComments)     
    }
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
        var users = msgSummary.querySelector('.message-header .favorite .users')
        if (newvote === 0) {
          users.removeChild(users.querySelector('.this-user'))
        } else {
          var userimg = com.userImg(app, app.user.id)
          userimg.classList.add('this-user')
          users.appendChild(userimg)
        }
      }
    })
  }
}

var statsOpts = { recursive: true }
var fetchRowState =
module.exports.fetchRowState = function (app, el, mid) {
  mid = mid || el.dataset.msg
  if (!mid) return
  app.ssb.relatedMessages({ id: mid, count: true }, function (err, thread) {
    var keys = []
    var first = true
    function acc (msg) {
      if (first || msg.value.content.type == 'post')
        keys.push(msg.key)
      first = false
      if (msg.related)
        msg.related.forEach(acc)
    }
    
    if (thread) {
      setRowState(app, el, thread)

      // check if any of the messages are unread
      // :TODO: needed?
      /*acc(thread)
      app.ssb.phoenix.isRead(keys, function (err, isreads) {
        for (var i=0; i < isreads.length; i++) {
          if (!isreads[i]) {
            el.classList.add('unread')
            return
          }
        }
      })*/
    }
  })
}

var setRowState =
module.exports.setRowState = function (app, el, thread) {
  if (!thread.related)
    return

  // collect comments and votes
  var comments = []
  var upvoters = {}
  thread.related.forEach(function (r) {
    var c = r.value.content
    if (c.type === 'vote') {
      if (c.vote === 1)
        upvoters[r.value.author] = 1
      else
        delete upvoters[r.value.author]
    }
    else if (c.type == 'post') {
      comments.push(r)
    }
  })

  // update vote ui
  if (upvoters[app.user.id])
    el.querySelector('.message-header .favorite a').classList.add('selected')
  el.querySelector('.message-header .favorite .users').innerHTML = ''
  for (var id in upvoters) {
    var userimg = com.userImg(app, id)
    if (id == app.user.id)
      userimg.classList.add('this-user')
    el.querySelector('.message-header .favorite .users').appendChild(userimg)
  }

  // render comments
  el.querySelector('.message-comments').innerHTML = ''
  comments.forEach(function (comment) {
    var cdiv = h('.comment',
      com.userImg(app, comment.value.author),
      h('.comment-inner', getSummary(app, comment)))
    el.querySelector('.message-comments').appendChild(cdiv)
  })
}

function ago (msg) {
  var str = u.prettydate(new Date(msg.value.timestamp))
  if (str === 'yesterday')
    str = '1d'
  return h('small.text-muted', str, ' ago')
}

function fetchMsgLink (app, mid) {
  var link = com.a('#/msg/'+mid, 'this post')
  var linkspan = h('span', link)
  app.ssb.get(mid, function (err, msg) {
    if (msg) {
      linkspan.insertBefore(h('span', (msg.author == app.user.id) ? 'your ' : com.userName(app, msg.author) + '\'s', ' post'), link)
      link.style.display = 'block'
      link.style.padding = '8px 0'
      link.style.color = 'gray'
      link.textContent = link.innerText = shorten((msg.content.type == 'post') ? msg.content.text : msg.content.type, 255)
    }
  })
  return linkspan
}