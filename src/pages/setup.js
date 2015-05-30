'ust strict'
var h = require('hyperscript')
var schemas = require('ssb-msg-schemas')
var com = require('../com')

module.exports = function (app) {

  // markup

  var input = h('input.form-control', { type: 'text', name: 'name', placeholder: 'Nickname', onkeyup: checkInput })
  var issue = h('span.text-danger')
  var postBtn = h('button.btn.btn-primary.pull-right', { disabled: true }, 'Save')
  app.setPage('setup', h('.row',
    h('.col-xs-6.col-xs-offset-3',
      h('br'), h('br'),
      h('h2', 'New account'),
      h('form.setup-form', { onsubmit: post },
        h('.panel.panel-default', { style: 'border: 0' },
          h('.panel-body',
            h('.form-group',
              h('label.control-label', { style: 'font-weight: normal' }, 'Welcome to ', h('strong', 'Secure Scuttlebutt!'), ' What should your nickname be?'),
              input
            )
          )
        ),
        h('.form-group', issue, postBtn)
      )
    )
  ), { noHeader: true })

  // handlers

  var badNameCharsRegex = /[^A-z0-9\._-]/
  function checkInput (e) {
    var valid = true, badchar
    if (!input.value)
      valid = false
    else if((badchar = badNameCharsRegex.exec(input.value))) {
      valid = false
      issue.innerHTML = 'Invalid character <code>'+badchar+'</code>. Name must only include the following characters: <code>A-z 0-9 . _ -</code>'
    }

    if (valid) {
      postBtn.removeAttribute('disabled')
      issue.innerHTML = ''
    } else
      postBtn.setAttribute('disabled', true)
  }

  function post (e) {
    e.preventDefault()
    if (input.value) {
      schemas.addContact(app.ssb, app.user.id, { name: input.value }, function (err) {
        if (err) swal('Error While Publishing', err.message, 'error')
        else window.location = '#/'          
      })
    }
  }
}