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
    var url = '/ext/'+link.ext

    if (!link.name && link.type) {
      // if we know the filetype, try to construct a good filename
      var ext = link.type.split('/')[1]
      if (ext)
        link.name = 'attachment.'+ext
    }

    if (link.name)
      url += '/'+link.name

    if (isImage(link))
      label = h('img', { src: url, title: link.name || link.ext })
    else
      label = [com.icon('file'), ' ', link.name, ' ', h('small', (('size' in link) ? u.bytesHuman(link.size) : ''), ' ', link.type||'')]
    els.push(h('a', { href: url+'?sp', target: '_blank' }, label))
  })
  return els.length ? h('.attachments', els) : undefined
}