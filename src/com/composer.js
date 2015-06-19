'use strict'
var h = require('hyperscript')
var com = require('./index')

module.exports = function (app, parent, opts) {

  // markup

  var composer = h('.composer' + ((!!parent) ? '.reply' : ''),
    com.postForm(app, parent, { onpost: onpost, rows: opts && opts.rows }))

  // handlers

  function onpost () {
    composer.parentNode.removeChild(composer)
    opts && opts.onpost && opts.onpost()
  }

  function cancel (e) {
    e.preventDefault()
    composer.parentNode.removeChild(composer)
  }

  return composer
}

module.exports.header = function (app, opts) {
  var placeholder = (opts && opts.placeholder) ? opts.placeholder : 'What\'s new?'

  var input = h('input.form-control', { placeholder: placeholder, onfocus: onfocus })
  var inner = h('.composer-header-inner', input)
  var header = h('.composer-header', inner)

  function onfocus (e) {
    e.preventDefault()

    // replace textarea with full form
    var form = com.postForm(app, null, { onpost: onpost, placeholder: placeholder })
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

  function onpost () {
    app.refreshPage()
  }

  return header
}