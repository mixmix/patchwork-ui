var h = require('hyperscript')
var suggestBox = require('suggest-box')
var app = require('../app')
var ui = require('../ui')
var com = require('./index')
var mentionslib = require('../mentions')

module.exports = function (id, opts) {

  // markup

  var name = com.userName(id)
  var textarea = h('textarea.form-control', { placeholder: 'Write your reason for flagging here.', rows: 4 })
  suggestBox(textarea, app.suggestOptions)
  var form = h('.flag-form',
    h('h3', com.icon('flag'), ' Flag "', name, '"'),
    h('p.text-muted', h('small', 'Warn your followers about this user.')),
    h('form', { onsubmit: onsubmit },
      h('.radios',
        opt('old-account', 'Old account'),
        opt('spammer',     'Spammer'),
        opt('abusive',     'Abusive'),
        opt('nsfw',        'NSFW'),
        opt('other',       'Other')
      ),
      h('p', textarea),
      h('p.text-right', h('button.btn.btn-3d', 'Publish'))
    )
  )

  function opt (value, label) {
    function onchange () {
      textarea.value = (value == 'other') ? '' : label
    }

    return h('.radio',
      h('label',
        h('input', { type: 'radio', name: 'flag-choice', value: value, onchange: onchange }),
        label
      )
    )
  }

  // handlers

  function onsubmit (e) {
    e.preventDefault()

    // prep text
    ui.pleaseWait(true)
    ui.setStatus('Publishing...')
    var reason = textarea.value
    var flag
    try { flag = form.querySelector(':checked').value } catch (e) {}
    mentionslib.extract(reason, function (err, mentions) {
      if (err) {
        ui.setStatus(null)
        ui.pleaseWait(false)
        console.error(err)
        if (err.conflict)
          swal('Error While Publishing', 'You follow multiple people with the name "'+err.name+'." Go to the homepage to resolve this before publishing.', 'error')
        else
          swal('Error While Publishing', err.message, 'error')
        return
      }

      var flagged = { reason: reason, flag: flag||'other' }
      if (mentions.length)
        flagged.mentions = mentions

      // publish
      schemas.addContact(app.ssb, id, { flagged: flagged }, function (err) {
        ui.setStatus(null)
        ui.pleaseWait(false)
        if (err) console.error(err), swal('Error While Publishing', err.message, 'error')
        else opts.onsubmit()
      })
    })
  }

  return form
}