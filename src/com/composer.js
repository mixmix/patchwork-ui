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

module.exports.header = function (app) {
  var input = h('input.form-control', { placeholder: 'What\'s new?', onfocus: onfocus })
  var inner = h('.composer-header-inner', input)
  var header = h('.composer-header', inner)

  function onfocus (e) {
    e.preventDefault()

    // replace textarea with full form
    var form = com.postForm(app)
    input.style.display = 'none'
    inner.appendChild(form)

    // focus textarea, set blur handler
    var textarea = form.querySelector('textarea')
    textarea.focus()
    textarea.onblur = onblur
  }

  function onblur (e) {
    // remove postform if it's empty
    var textarea = e.target
    if (!textarea.value) {
      var form = inner.querySelector('.post-form')
      inner.removeChild(form)
      input.style.display = 'block'
    }
  }

  return header
}