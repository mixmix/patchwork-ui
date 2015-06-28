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
  var initval = (opts && opts.initval) ? opts.initval : ''
  var placeholder = (opts && opts.placeholder) ? opts.placeholder : 'What\'s new?'

  var input = h('input.form-control', { placeholder: placeholder, onfocus: onfocus })
  var inner = h('.composer-header-inner', input)
  var header = h('.composer-header', inner)
  var form

  function onfocus (e) {
    e.preventDefault()

    // replace textarea with full form
    form = com.postForm(app, null, { onpost: onpost, noheader: true, rows: 6, placeholder: placeholder, initval: initval })
    input.style.display = 'none'
    inner.appendChild(form)
    header.classList.add('open')

    // focus textarea, set blur handler
    var textarea = form.querySelector('textarea')
    textarea.focus()
    textarea.selectionStart = textarea.selectionEnd = textarea.value.length
    textarea.onblur = onblur
  }

  function onblur (e) {
    // cancel if empty
    if (e.target.value && e.target.value != initval)
      return
    inner.removeChild(form)
    input.style.display = 'block'
    header.classList.remove('open')
  }

  function onpost () {
    app.refreshPage()
  }

  return header
}