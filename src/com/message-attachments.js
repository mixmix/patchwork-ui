var h = require('hyperscript')
var mlib = require('ssb-msgs')
var com = require('./index')
var u = require('../lib/util')

var imageTypes = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml'  
}
function isImage (link) {
  if (link.type && link.type.indexOf('image/') !== -1)
    return true
  if (link.name && imageTypes[link.name.split('.').slice(-1)[0].toLowerCase()])
    return true
}

module.exports = function (app, msg) {
  var els = []
  mlib.indexLinks(msg.value.content, { ext: true }, function (link, rel) {
    var label
    if (isImage(link))
      label = h('img', { src: '/ext/'+link.ext, title: link.name || link.ext })
    else
      label = [com.icon('file'), ' ', link.name, ' ', h('small', (('size' in link) ? u.bytesHuman(link.size) : ''), ' ', link.type||'')]
    els.push(h('a', { href: '/ext/'+link.ext, target: '_blank' }, label))
  })
  return els.length ? h('.attachments', els) : undefined
}