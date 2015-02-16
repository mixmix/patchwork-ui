'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var com = require('./index')
var u = require('../lib/util')
var markdown = require('../lib/markdown')
var mentions = require('../lib/mentions')

module.exports = function (app, msg, opts) {

  // markup


  var outrefs = mlib.getLinks(msg.value.content).map(function (ref) {
    return h('.outref', { 'data-rel': ref.rel }, renderRef(app, msg, ref))
  })

  var content
  if (msg.value.content.type == 'post') {
    content = h('.content', { innerHTML: mentions.post(markdown.block(msg.value.content.text), app, msg) })
  } else if (!opts || !opts.noRaw) {
    content = h('.content', com.message.raw(app, msg))
  }

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

  if (ref.msg) {
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
            preview.push([com.icon('off'), ' New user: ', u.shortString(app.names[msg.value.author] || msg.value.author, 60)])
          },
          name: function () {
            preview = preview.concat(mlib.getLinks(target.content, { tofeed: true, rel: 'names' }).map(linkRender.names.bind(null, app)))
          },
          follow: function () {
            preview = preview.concat(mlib.getLinks(target.content, { tofeed: true, rel: 'follows' }).map(linkRender.follows.bind(null, app)))
            preview = preview.concat(mlib.getLinks(target.content, { tofeed: true, rel: 'unfollows' }).map(linkRender.unfollows.bind(null, app)))
          },
          trust: function () { 
            preview = preview.concat(mlib.getLinks(target.content, { tofeed: true, rel: 'trusts' }).map(linkRender.trusts.bind(null, app)))
          }
        }[type])()
      } catch (e) { }

      if (preview.length === 0)
        preview.push([type])

      var link = h('a', { href: '#/posts?start='+encodeURIComponent(ref.msg) }, preview)
      el.appendChild(link)

    })
  } 
  if (ref.feed) {
    var link = h('a', { href: '#/profile/' + ref.feed }, renderLink(ref))
    el.appendChild(link)
  } 
  if (ref.ext) {
    var link = h('a',
      { href: '/ext/'+ref.ext, target: '_blank' },
      com.icon('file'), ' ', ref.name, ' ', h('small', (('size' in ref) ? u.bytesHuman(ref.size) : ''), ' ', ref.type||''))
    el.appendChild(h('div', link))
  }

  function renderLink (l) {
    return [com.userlink(ref.feed, app.names[ref.feed]), com.nameConfidence(ref.feed, app)]
  }

  return el
}

/*var linkRender = {
  names: function (app, l) {
    return [com.icon('tag'), ' ', u.shortString((app.names[l.feed] || l.name || l.feed), 60)]
  },
  follows: function (app, l) {
    return [com.icon('plus'), ' Followed ', u.shortString(app.names[l.feed] || l.feed, 60)]
  },
  unfollows: function (app, l) {
    return [com.icon('minus'), ' Unfollowed ', u.shortString(app.names[l.feed] || l.feed, 60)]
  },
  trusts: function (app, l) {
    if (l.value > 0)
      return [com.icon('lock'), ' Trusted ', u.shortString(app.names[l.feed] || l.feed, 60)]
    else if (l.value < 0)
      return [com.icon('flag'), ' Flagged ', u.shortString(app.names[l.feed] || l.feed, 60)]
    else
      return ['Untrusted/Unflagged '+u.shortString(app.names[l.feed] || l.feed, 60)]
  }
}*/

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