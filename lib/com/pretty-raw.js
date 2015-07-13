var h = require('hyperscript')
var com = require('./index')
var u = require('../util')

function file (link, rel) {
  var name = link.name || rel
  var details = (('size' in link) ? u.bytesHuman(link.size) : '') + ' ' + (link.type||'')
  return h('a', { href: '/ext/'+link.ext, target: '_blank', title: name +' '+details }, name, ' ', h('small', details))
}

function message (link, rel) {
  if (typeof rel == 'string')
    return h('a', { href: '#/msg/'+link.msg, innerHTML: u.escapePlain(rel)+' &raquo;' })
}

var prettyRaw =
module.exports = function (app, obj, path) {
  if (typeof obj == 'string')
    return h('span.pretty-raw', h('em', 'Encrypted message'))

  function col (k, v) {
    k = (k) ? path+k : ''
    return h('span.pretty-raw', h('small', k), v)
  }

  var els = []
  path = (path) ? path + '.' : ''
  for (var k in obj) {
    if (obj[k] && typeof obj[k] == 'object') {
      // :TODO: render links
      // if (obj[k].ext)
      //   els.push(col('', file(obj[k])))
      // if (obj[k].msg)
      //   els.push(col('', message(obj[k])))
      // if (obj[k].feed)
      //   els.push(col(k, com.user(app, obj[k].feed)))
      els = els.concat(prettyRaw(app, obj[k], path+k))
    }
    else
      els.push(col(k, ''+obj[k]))
  }

  return els
}

var prettyRawTable =
module.exports.table = function (app, obj, path) {
  if (typeof obj == 'string')
    return h('tr.pretty-raw', h('em', 'Encrypted message'))

  function row (k, v) {
    if (typeof v === 'boolean')
      v = com.icon(v ? 'ok' : 'remove')
    return h('tr.pretty-raw', h('td', path+k), h('td', v))
  }

  var els = []
  path = (path) ? path + '.' : ''
  for (var k in obj) {
    if (obj[k] && typeof obj[k] == 'object') {
      els = els.concat(prettyRawTable(app, obj[k], path+k))
    } else if (k == 'msg')
      els.push(row(k, com.a('#/msg/'+obj.msg, obj.msg)))
    else if (k == 'ext')
      els.push(row(k, com.a('/ext/'+obj.ext, obj.ext, { target: '_blank' })))
    else if (k == 'feed')
      els.push(row(k, com.user(app, obj.feed)))
    else
      els.push(row(k, obj[k]))

  }

  return els  
}