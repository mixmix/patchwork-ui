var h = require('hyperscript')
var mlib = require('ssb-msgs')
var querystring = require('querystring')
var com = require('./index')
var u = require('../util')

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
    var url = 'blob:'+link.ext
    var qs = {}

    if (!link.name && link.type) {
      // if we know the filetype, try to construct a good filename
      var ext = link.type.split('/')[1]
      if (ext)
        link.name = 'attachment.'+ext
    }

    if (link.name)
      qs.name = link.name
    if (isImage(link))
      qs.fallback = 'img'
    if (Object.keys(qs))
      url += querystring.stringify(qs)

    if (isImage(link))
      label = h('.image', { 'data-bg': 'blob:'+link.ext, style: 'background-image: url('+encodeURI(url)+')' })
    else
      label = h('.file', com.icon('file'), ' ', link.name, ' ', h('small', (('size' in link) ? u.bytesHuman(link.size) : ''), ' ', link.type||''))
    els.push(h('a', { href: url, target: '_blank' }, label))
  })
  return els.length ? h('.attachments', els) : undefined
}