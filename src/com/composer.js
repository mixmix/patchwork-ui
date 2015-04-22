'use strict'
var h = require('hyperscript')
var com = require('./index')

module.exports = function (app, parent) {

  // markup

  var composer = h('.composer' + ((!!parent) ? '.reply' : ''),
    h('p',
      h('small.text-muted', 
        'All posts are public. Markdown, @-mentions, and emojis are supported. ',
        h('a', { href: '#/action/cancel', onclick: cancel }, 'Cancel'))),
    com.postForm(app, parent))

  // handlers

  function cancel (e) {
    e.preventDefault()
    composer.parentNode.removeChild(composer)
  }

  return composer
}