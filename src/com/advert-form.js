'use strict'
var h = require('hyperscript')
var schemas = require('ssb-msg-schemas')
var com = require('../com')
var markdown = require('../lib/markdown')

module.exports = function (app) {
  
  // markup

  var textarea = h('textarea.form-control', { name: 'text', rows: 3, onkeyup: renderPreview })
  var preview = h('.preview.well.well-sm')
  var form = h('form.advert-form', { onsubmit: post },
    h('.open',
      h('p', textarea),
      h('p.post-form-btns', h('button.btn.btn-primary', 'Post'), ' ', h('button.btn.btn-primary', { href: '#', onclick: close }, 'Cancel')),
      h('.adverts-but-its-cool-tho', preview)
    ),
    h('.closed', h('button.btn.btn-primary', { onclick: open }, 'New Advert'))
  )

  // event handlers

  function renderPreview (e) {
    preview.innerHTML = markdown.block(textarea.value)
  }

  function post (e) {
    e.preventDefault()
    schemas.addAdvert(app.ssb, textarea.value, function (err) {
      if (err) swal('Error While Publishing', err.message, 'error')
      else {
        swal('Your Ad Has Been Published', null, 'success')
        app.refreshPage()
      }
    })
  }

  function open (e) {
    e.preventDefault()
    form.classList.add('opened')
  }

  function close (e) {
    e.preventDefault()
    form.reset()
    form.classList.remove('opened')
    preview.innerHTML = ''
  }

  return form
}