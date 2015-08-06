'use strict'
var h = require('hyperscript')
var o = require('observable')
var com = require('./index')

module.exports = function (parent, opts) {

  // markup

  var composer = h('.composer' + ((!!parent) ? '.reply' : ''),
    com.postForm(parent, { onpost: onpost, rows: opts && opts.rows }))

  // handlers

  function onpost (msg) {
    composer.parentNode.removeChild(composer)
    opts && opts.onpost && opts.onpost(msg)
  }

  function cancel (e) {
    e.preventDefault()
    composer.parentNode.removeChild(composer)
  }

  return composer
}

module.exports.header = function (opts) {

  var selection = o('post')
  function navitem (icon, value) {
    return o.transform(selection, function (s) {
      return h('a'+((s == value) ? '.selected' : ''), { onclick: onSelect(value) }, com.icon(icon))
    })
  }

  // markup

  var header = h('.composer-header',
    h('.composer-header-nav',
      navitem('comment', 'post'),
      navitem('facetime-video', 'webcam'),
      navitem('picture', 'photo'),
      navitem('file', 'file')
    ),
    h('.composer-header-body', o.transform(selection, function (s) {
      if (s == 'post')
        return post(opts)
      return h('em', s + ': todo')
    }))
  )

  // handlers

  function onSelect (value) {
    return function (e) {
      e.preventDefault()
      selection(value)
    }
  }

  return header
}

function post (opts) {

  // markup

  var form
  var placeholder = 'Share a message with the world...'
  var input = h('input.form-control', { placeholder: placeholder, onfocus: onfocus })

  // handlers

  function onfocus (e) {
    e.preventDefault()

    // replace textarea with full form
    form = com.postForm(null, { onpost: onpost, noheader: true, rows: 6, placeholder: placeholder })
    input.style.display = 'none'
    input.parentNode.appendChild(form)

    // focus textarea, set blur handler
    var textarea = form.querySelector('textarea')
    textarea.focus()
    textarea.selectionStart = textarea.selectionEnd = textarea.value.length
  }

  function onpost (msg) {
    input.parentNode.removeChild(form)
    input.style.display = 'block'
    opts && opts.onpost && opts.onpost(msg)
  }

  return input
}