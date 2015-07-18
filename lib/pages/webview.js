'use strict'
var h = require('hyperscript')
var com = require('../com')
var app = require('../app')
var isref = require('ssb-ref')

module.exports = function () {
  var param = app.page.param
  var url = 'http://localhost:' + ((isref.isHash(param)) ? 7777 : 7778) + '/' + param

  // markup

  var webview = h('webview', { src: url })
  ui.setPage('webview', webview, { onPageTeardown: function () { window.removeEventListener('resize', resize) }})
  window.addEventListener('resize', resize)
  resize()

  function resize () {
    var obj = webview.querySelector('::shadow object')
    obj.style.height = (window.innerHeight - obj.offsetTop) + 'px'
  }
}
