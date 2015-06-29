var h = require('hyperscript')
var com = require('./index')

module.exports = function (app, opts) {

  // markup

  var processingInfoText = h('p')
  var processingInfo = h('.processing-info', h('.spinner', h('.cube1'), h('.cube2')), processingInfoText)
  var errorText = h('span', 'Something went wrong!')
  var error = h('.error.text-danger', com.icon('exclamation-sign'), ' ', errorText)
  var useBtn = h('button.btn.btn-3d', 'Use Code')
  var codeinput = h('input.form-control', { placeholder: 'Enter the invite code here' })
  var form = h('.invite-form',
    h('h3', 'Accept an Invite'),
    h('form.form-inline', { onsubmit: function (e) { e.preventDefault(); opts.onsubmit(codeinput.value) } },
      h('p', codeinput, useBtn)),
    processingInfo,
    error,
    h('hr'),
    h('p.text-muted', 'Don\' have an invite? ', h('a', { href: 'https://github.com/ssbc/scuttlebot/wiki/Pub-Servers', target: '_blank' }, 'Get one here.')))

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