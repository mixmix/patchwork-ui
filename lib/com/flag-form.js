var h = require('hyperscript')
var suggestBox = require('suggest-box')
var com = require('./index')
var mentionslib = require('../mentions')

module.exports = function (app, id, opts) {

  // markup

  var name = com.userName(app, id)
  var textarea = h('textarea.form-control', { placeholder: 'Write your reason for flagging here (optional)', rows: 4, onkeyup: onkeyup })
  suggestBox(textarea, app.ui.suggestOptions)
  var form = h('.flag-form',
    h('h3', 'Flag "', name, '"'),
    h('p.text-muted', h('small', 'Warn your followers about this user.')),
    h('form', { onsubmit: onsubmit },
      opt('dead',        'This user lost their account keys, and has created another account.'),
      opt('compromised', 'This user had their keys stolen, and has created another account.'),
      opt('spammer',     'This user is a spammer.'),
      opt('troll',       'This user is a troll.'),
      opt('imposter',    'This user is an imposter that\'s actively pretending to be somebody else.'),
      h('hr'),
      h('p', textarea),
      h('hr'),
      h('p.text-right', h('button.btn.btn-3d', 'Publish'))
    )
  )

  function opt (value, label) {
    function onchange () {
      textarea.value = label
    }

    return h('.radio',
      h('label',
        h('input', { type: 'radio', name: 'flag-choice', value: value, onchange: onchange }),
        label
      )
    )
  }

  function onkeyup () {
    try {
      form.querySelector('input:checked').checked = false
    } catch (e) {}
  }

  // handlers

  function onsubmit (e) {
    e.preventDefault()

    // prep text
    app.ui.pleaseWait(true)
    app.ui.setStatus('info', 'Publishing...')
    var reason = textarea.value
    mentionslib.extract(app, reason, function (err, mentions) {
      if (err) {
        app.ui.setStatus(null)
        app.ui.pleaseWait(false)
        if (err.conflict)
          swal('Error While Publishing', 'You follow multiple people with the name "'+err.name+'." Go to the homepage to resolve this before publishing.', 'error')
        else
          swal('Error While Publishing', err.message, 'error')
        return
      }

      var flagged = { reason: reason }
      if (mentions.length)
        flagged.mentions = mentions

      // publish
      schemas.addContact(phoenix.ssb, id, { flagged: flagged }, function (err) {
        app.ui.setStatus(null)
        app.ui.pleaseWait(false)
        if (err) swal('Error While Publishing', err.message, 'error')
        else opts.onsubmit()
      })
    })
  }

  return form
}