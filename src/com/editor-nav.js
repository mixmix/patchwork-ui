var h = require('hyperscript')
var com = require('./index')

module.exports = function (app, opts) {
  opts = opts || {}

  // markup

  var treeEl = h('.obj-tree', objtree(window.program, []))
  var navEl = h('.editor-nav',
    com.nav({
      current: 'program',
      items: [
        ['program', ontab, 'Program'],
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

    var a = h('a', { href: '#/program-editor/'+(path.concat(k).join('.')) }, k)
    lis.push(h('li.'+t, a, sub))
  }
  return h('ul', lis)
}