var h = require('hyperscript')
var com = require('./index')

module.exports = function (app, opts) {
  opts = opts || {}

  // markup

  var treeEl = h('.obj-tree', objtree(window.program, []))
  var navEl = h('.editor-nav',
    com.nav({
      current: 'browse',
      items: [
        ['browse', ontab, 'Browse'],
        ['help', ontab, 'Help']
      ]
    }),
    h('.editor-nav-body', treeEl))

  // handlers

  var ontab = '' // :TODO:

  return navEl
}

function objtree (obj, path) {
  var lis = []
  for (var k in obj) {
    var t = typeof obj[k]
    var sub = undefined

    if (t == 'object') {
      if (obj[k])
        sub = objtree(obj[k], path.concat(k))
      else
        t = 'null'
    }

    var content = k
    if (t == 'function')
      content = h('a', { href: '#/program-editor/'+(path.concat(k).join('.')) }, k)

    lis.push(h('li.'+t, content, sub))
  }
  return h('ul', lis)
}