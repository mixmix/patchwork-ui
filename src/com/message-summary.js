'use strict'
var h = require('hyperscript')
var pull = require('pull-stream')
var mlib = require('ssb-msgs')
var com = require('./index')
var util = require('../lib/util')
var markdown = require('../lib/markdown')
var mentions = require('../lib/mentions')

function summaryStr (str) {
  str = util.escapePlain(str)
  if (str.length > 60)
    str = str.slice(0, 57) + '...'
  return str
}

function getSummary (app, msg) {
  try {
    var s = ({
      post: function () { return [com.icon('comment'), ' ', summaryStr(msg.value.content.text)] },
      advert: function () { return [com.icon('bullhorn'), ' ', summaryStr(msg.value.content.text)] },
      init: function () {
        return [com.icon('off'), ' New user: ', (app.names[msg.value.author] || msg.value.author)]
      },
      name: function () {
        return mlib.getLinks(msg.value.content, { tofeed: true, rel: 'names' })
          .map(function (l) { return [com.icon('tag'), ' ', (app.names[l.feed] || l.feed), ' is ', l.name] })
      },
      follow: function () {
        return mlib.getLinks(msg.value.content, { tofeed: true, rel: 'follows' })
          .map(function (l) { return [com.icon('plus'), ' Followed ', (app.names[l.feed] || l.feed)] })
          .concat(mlib.getLinks(msg.value.content, { tofeed: true, rel: 'unfollows' })
            .map(function (l) { return [com.icon('minus'), ' Unfollowed ', (app.names[l.feed] || l.feed)] }))
      },
      trust: function () { 
        return mlib.getLinks(msg.value.content, { tofeed: true, rel: 'trusts' })
          .map(function (l) {
            if (l.value > 0)
              return [com.icon('lock'), ' Trusted ', (app.names[l.feed] || l.feed)]
            if (l.value < 0)
              return [com.icon('flag'), ' Flagged ', (app.names[l.feed] || l.feed)]
            return 'Untrusted/Unflagged '+(app.names[l.feed] || l.feed)
          })
      },
    })[msg.value.content.type]()
    if (!s || s.length == 0)
      s = false
    return s
  } catch (e) { return '' }
}

var attachmentOpts = { toext: true, rel: 'attachment' }
module.exports = function (app, msg, opts) {

  // markup

  var content = getSummary(app, msg)

  var depth = (opts && opts.depth) ? opts.depth * 20 : 0
  var treeExpander = h('span.tree-expander', { style: 'padding-left: '+depth+'px' })

  var name = app.names[msg.value.author] || util.shortString(msg.value.author)
  var nameConfidence = com.nameConfidence(msg.value.author, app)
  var msgSummary = h('tr.message-summary',
    h('td', treeExpander, ' ', content || h('span.text-muted', msg.value.content.type)),
    h('td', com.userlink(msg.value.author, name), nameConfidence),
    h('td.text-muted', util.prettydate(new Date(msg.value.timestamp)))
  )
  return msgSummary
}

function noHtmlLen (str) {
  var entityLen = 0
  str.replace(/<.*>/g, function($0) {
    entityLen += $0.length
  })
  return str.length - entityLen
}