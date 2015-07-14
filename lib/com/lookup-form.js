var h = require('hyperscript')
var com = require('./index')

module.exports = function (opts) {

  // markup

  var processingInfoText = h('p')
  var processingInfo = h('.processing-info', h('.spinner', h('.cube1'), h('.cube2')), processingInfoText)
  var errorText = h('span', 'Something went wrong!')
  var error = h('.error.text-danger', com.icon('exclamation-sign'), ' ', errorText)
  var useBtn = h('button.btn.btn-3d', 'Find')
  var codeinput = h('input.form-control', { placeholder: 'Enter your friend\'s lookup code here' })
  var form = h('.lookup-form',
    h('h3', 'Find a Friend'),
    h('form.form-inline', { onsubmit: function (e) { e.preventDefault(); if (codeinput.value) { opts.onsubmit(codeinput.value) } } },
      h('p', codeinput, useBtn)),
    processingInfo,
    error,
    h('hr'),
    h('.help',
      h('h3', 'Get your Lookup Code'),
      h('p', 'Need to send somebody your lookup code? Here\'s how to find it.'),
      h('.help-section',
        h('img', { src: 'img/help-open-profile-dropdown.gif' }),
        h('div', h('p', h('strong', '1.'), ' Click on your profile picture on the top right.'))
      ),
      h('.help-section',
        h('img', { src: 'img/help-select-lookup-code.gif' }),
        h('div', h('p', h('strong', '2.'), ' Select "Your Lookup Code."'))
      ),
      h('.help-section',
        h('img', { src: 'img/help-copy-lookup.gif' }),
        h('div',
          h('p', h('strong', '3.'), ' Copy the code to your clipboard.'),
          h('p', h('strong', '4.'), ' Email/chat/SMS it!')
        )
      )
    )
  )

  // api

  form.disable = function () {
    useBtn.setAttribute('disabled', true)
    codeinput.setAttribute('disabled', true)
  }

  form.enable = function () {
    useBtn.removeAttribute('disabled')
    codeinput.removeAttribute('disabled')
  }

  form.setProcessingText = function (text) {
    error.style.display = 'none'
    processingInfoText.innerHTML = text
    processingInfo.style.display = 'block'
  }

  form.setErrorText = function (text) {
    processingInfo.style.display = 'none'
    errorText.innerHTML = text
    error.style.display = 'block'
  }

  return form
}