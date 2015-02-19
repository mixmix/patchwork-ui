var h = require('hyperscript')
var com = require('./index')
var u = require('../lib/util')

function file (link) {
  var name = link.name || link.rel
  var details = (('size' in link) ? u.bytesHuman(link.size) : '') + ' ' + (link.type||'')
  return h('a', { href: '/ext/'+link.ext, target: '_blank', title: name +' '+details }, name, ' ', h('small', details))
}

function message (link) {
  return com.a('#/msg/'+link.msg, link.rel)
}

var prettyRaw =
module.exports = function (app, obj, path) {
  function col (k, v) {
    return h('span.pretty-raw', h('small', path+k), v)
  }

  var els = []
  path = (path) ? path + '.' : ''
  for (var k in obj) {
    if (obj[k] && typeof obj[k] == 'object') {
      if (obj[k].rel) {
        if (obj[k].ext)
          els.push(col(k, file(obj[k])))
        if (obj[k].msg)
          els.push(col('', message(obj[k])))
        if (obj[k].feed)
          els.push(col(k, com.user(app, obj[k].feed)))
      } else
        els = els.concat(prettyRaw(app, obj[k], path+k))
    } else if (k == 'msg')
      els.push(col(k, message(obj)))
    else if (k == 'ext')
      els.push(col('', file(obj)))
    else if (k == 'feed')
      els.push(col(k, com.user(app, obj.feed)))
    else
      els.push(col(k, ''+obj[k]))

  }

  return els
}

var prettyRawTable =
module.exports.table = function (app, obj, path) {
  function row (k, v) {
    return h('tr.pretty-raw', h('td', h('small', path+k)), h('td', v))
  }

  var els = []
  path = (path) ? path + '.' : ''
  for (var k in obj) {
    if (obj[k] && typeof obj[k] == 'object') {
      els = els.concat(prettyRawTable(app, obj[k], path+k))
    } else if (k == 'msg')
      els.push(row(k, com.a('#/msg/'+obj.msg, obj.msg)))
    else if (k == 'ext')
      els.push(row(k, com.a('#/ext/'+obj.ext, obj.ext, { target: '_blank' })))
    else if (k == 'feed')
      els.push(row(k, com.user(app, obj.feed)))
    else
      els.push(row(k, ''+obj[k]))

  }

  return els  
}