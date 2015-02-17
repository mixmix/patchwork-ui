'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var com = require('./index')
var u = require('../lib/util')
var markdown = require('../lib/markdown')
var mentions = require('../lib/mentions')

function getContent (app, msg, opts) {

  function md (str) {
    return h('.content', { innerHTML: mentions.post(markdown.block(str), app, msg) })
  }

  function user (ext) {
    return [com.userlink(ext, app.names[ext]), com.nameConfidence(ext, app)]
  }

  try {
    var c = ({
      post: function () { return md(msg.value.content.text) },
      advert: function () { return md(msg.value.content.text) },
      init: function () {
        return h('.content', h('p', com.icon('off'), ' New user: ', user(msg.value.author)))
      },
      name: function () {
        var nameLinks = mlib.getLinks(msg.value.content, { tofeed: true, rel: 'names' })
        if (nameLinks.length)
          return h('.content', h('p', nameLinks.map(function (l) { return [com.icon('tag'), ' ', user(l.feed), ' is ', l.name] })))
        return h('.content', h('p', com.icon('tag'), ' ', user(msg.value.author), ' is ', msg.value.content.name))
      },
      follow: function () {
        return h('.content',
          mlib.getLinks(msg.value.content, { tofeed: true, rel: 'follows' })
            .map(function (l) { return h('p', com.icon('plus'), ' Followed ', user(l.feed)) })
            .concat(mlib.getLinks(msg.value.content, { tofeed: true, rel: 'unfollows' })
              .map(function (l) { return h('p', com.icon('minus'), ' Unfollowed ', user(l.feed)) })))
      },
      trust: function () { 
        return h('.content',
          mlib.getLinks(msg.value.content, { tofeed: true, rel: 'trusts' })
            .map(function (l) {
              if (l.value > 0)
                return h('p', com.icon('lock'), ' Trusted ', user(l.feed))
              if (l.value < 0)
                return h('p', com.icon('flag'), ' Flagged ', user(l.feed))
              return h('p', 'Untrusted/Unflagged ', user(l.feed))
            }))
      },
    })[msg.value.content.type]()
    if (!c || c.children.length === 0)
      throw "Nah lets do it raw"
    return c
  } catch (e) { 
    return h('.content', com.message.raw(app, msg))
  }
}

module.exports = function (app, msg, opts) {

  // markup

  var outrefs = mlib.getLinks(msg.value.content).map(function (ref) {
    if (ref.msg)
      return // no msg links
    return h('.outref', { 'data-rel': ref.rel }, renderRef(app, msg, ref))
  })

  var content = getContent(app, msg, opts)

  return h('.message-preview',
    (opts && opts.title) ? h('.title', opts.title) : '',
    h('.value',
      h('ul.headers.list-inline',
        h('li', com.a('#/msg/'+msg.key, com.icon('new-window'), { target: '_blank' })),
        (opts && opts.selectBtn) ?
          h('li', com.a('#/', com.icon('arrow-right'))) :
          '',
        h('li', h('small', 'by '), com.userlink(msg.value.author, app.names[msg.value.author]), com.nameConfidence(msg.value.author, app)),
        h('li', h('small', 'type '), com.a('#/', msg.value.content.type)),
        h('li', h('small', 'from '), com.a('#/', u.prettydate(new Date(msg.value.timestamp), true), { title: 'View message thread' }))),
      content),
    outrefs)
}

function renderRef (app, msg, ref) {
  var el = h('.content')

  // DISABLED
  /*if (ref.msg) {
    el.innerHTML = '&nbsp;'
    app.ssb.get(ref.msg, function (err, target) {
      if (!target) {
        el.appendChild(h('p', err.message))
        el.appendChild(h('.raw', kvList(ref)))
        return
      }

      var type = target.content.type
      var preview = []

      try {
        ;({
          post: function () { 
            preview.push([com.icon('comment'), ' ', u.shortString(target.content.text || '', 60)])
          },
          advert: function () {
            preview.push([com.icon('bullhorn'), ' ', u.shortString(target.content.text || '', 60)])
          },
          init: function () {
            preview.push([com.icon('off'), ' New user: ', renderFeed(msg.value.author)])
          },
          name: function () {
            preview = preview.concat(mlib.getLinks(target.content, { tofeed: true, rel: 'names' }).map(renderLink.names.bind(null, app)))
          },
          follow: function () {
            preview = preview.concat(mlib.getLinks(target.content, { tofeed: true, rel: 'follows' }).map(renderLink.follows.bind(null, app)))
            preview = preview.concat(mlib.getLinks(target.content, { tofeed: true, rel: 'unfollows' }).map(renderLink.unfollows.bind(null, app)))
          },
          trust: function () { 
            preview = preview.concat(mlib.getLinks(target.content, { tofeed: true, rel: 'trusts' }).map(renderLink.trusts.bind(null, app)))
          }
        }[type])()
      } catch (e) { }

      if (preview.length === 0)
        preview.push([type])

      var link = h('a', { href: '#/posts?start='+encodeURIComponent(ref.msg) }, preview)
      el.appendChild(link)

    })
  } */
  if (ref.feed) {
    var link = h('a', { href: '#/profile/' + ref.feed }, renderFeed(ref))
    el.appendChild(link)
  } 
  if (ref.ext) {
    var link = h('a',
      { href: '/ext/'+ref.ext, target: '_blank' },
      com.icon('file'), ' ', ref.name, ' ', h('small', (('size' in ref) ? u.bytesHuman(ref.size) : ''), ' ', ref.type||''))
    el.appendChild(h('div', link))
  }

  function renderFeed (l) {
    var feed = l.feed || l
    return [com.userlink(feed, app.names[feed]), com.nameConfidence(feed, app)]
  }

  var renderLink = {
    names: function (app, l) {
      return [com.icon('tag'), ' ', renderFeed(l), ' is ', u.shortString((app.names[l.feed] || l.name || l.feed), 60)]
    },
    follows: function (app, l) {
      return [com.icon('plus'), ' Followed ', renderFeed(l)]
    },
    unfollows: function (app, l) {
      return [com.icon('minus'), ' Unfollowed ', renderFeed(l)]
    },
    trusts: function (app, l) {
      if (l.value > 0)
        return [com.icon('lock'), ' Trusted ', renderFeed(l)]
      else if (l.value < 0)
        return [com.icon('flag'), ' Flagged ', renderFeed(l)]
      else
        return ['Untrusted/Unflagged ', renderFeed(l)]
    }
  }

  return el
}


function kvList (obj, indent) {
  indent = indent || ''
  var str = ''
  for (var k in obj) {
    var v = (obj[k] && typeof obj[k] == 'object') ?
      ('\n' + kvList(obj[k], indent + '  ')) :
      obj[k]
    str += indent + k + ': ' + v + '\n'
  }
  return str
}