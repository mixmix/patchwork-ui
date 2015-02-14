'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var com = require('./index')
var u = require('../lib/util')
var markdown = require('../lib/markdown')
var mentions = require('../lib/mentions')

module.exports = function (app, msg, opts) {

  // markup

  var refsStr = ''
  if (msg.numThreadReplies == 1) refsStr = ', 1 reference'
  if (msg.numThreadReplies > 1) refsStr = ', '+msg.numThreadReplies+' refs'

  /*var msgfooter
  var attachments = mlib.getLinks(msg.value.content, attachmentOpts)
  if (attachments.length) {
    msgfooter = h('.panel-footer',
      h('ul', attachments.map(function (link) {
        var url = '#/ext/'+link.ext
        if (link.name)
          url += '?name='+encodeURIComponent(link.name)+'&msg='+encodeURIComponent(msg.key)
        return h('li', h('a', { href: url }, link.name || u.shortString(link.ext)))
      }))
    )
  }*/

  var outrefs = mlib.getLinks(msg.value.content).map(function (ref) {
    return h('.outref', { 'data-rel': ref.rel }, renderRef(app, msg, ref))
  })

  var content
  if (msg.value.content.type == 'post') {
    content = h('div', { innerHTML: mentions.post(markdown.block(msg.value.content.text), app, msg) })
  } else {
    content = com.message.raw(app, msg)
  }

  return h('.message-preview',
    h('.value',
      h('ul.headers.list-inline',
        h('li', com.a('#/msg/'+msg.key, com.icon('new-window'), { target: '_blank' })),
        h('li', h('small', 'by '), com.userlink(msg.value.author, app.names[msg.value.author]), com.nameConfidence(msg.value.author, app)),
        h('li', h('small', 'type '), com.a('#/', msg.value.content.type)),
        h('li', h('small', 'from '), com.a('#/', u.prettydate(new Date(msg.value.timestamp), true)+refsStr, { title: 'View message thread' }))),
      h('.content', content)),
    outrefs)
}

function renderRef (app, msg, ref) {
  var el = h('.content')
  if (ref.msg) {
    el.innerHTML = '&nbsp;'
    app.ssb.get(ref.msg, function (err, target) {
      if (!target) {
        el.appendChild('p', err.message)
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
            return mlib.getLinks(target.content, { tofeed: true, rel: 'names' }).forEach(function (l) {
              preview.push([com.icon('tag'), u.shortString((app.names[l.feed] || l.feed) + ' is ' + l.name, 60)])
            })
          },
          follow: function () {
            mlib.getLinks(target.content, { tofeed: true, rel: 'follows' }).forEach(function (l) {
              preview.push([com.icon('plus'), ' Followed ', u.shortString(app.names[l.feed] || l.feed, 60)])
            })
            mlib.getLinks(target.content, { tofeed: true, rel: 'unfollows' }).forEach(function (l) {
              preview.push([com.icon('minus'), ' Unfollowed ', u.shortString(app.names[l.feed] || l.feed, 60)])
            })
          },
          trust: function () { 
            mlib.getLinks(target.content, { tofeed: true, rel: 'trusts' }).forEach(function (l) {
              if (l.value > 0)
                preview.push([com.icon('lock'), ' Trusted ', u.shortString(app.names[l.feed] || l.feed, 60)])
              else if (l.value < 0)
                preview.push([com.icon('flag'), ' Flagged ', u.shortString(app.names[l.feed] || l.feed, 60)])
              else
                preview.push(['Untrusted/Unflagged '+u.shortString(app.names[l.feed] || l.feed, 60)])
            })
          }
        }[type])()
      } catch (e) { console.debug(type, e)}

      if (preview.length === 0)
        preview.push([type])

      var link = h('a', { href: '#' /* onclick todo */}, preview)
      el.appendChild(link)
    })
  } else {
    el.appendChild(h('.raw', kvList(ref)))
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