var h = require('hyperscript')
var com = require('../com')

var subwindows = []
var makeSubwindow =
module.exports.subwindow = function (el, title, opts) {
  // create a context so we can release this window on close
  var h2 = h.context()
  var canclose = true

  // markup

  var collapseToggleIcon = com.icon('chevron-down')
  var subwindow = h2('.subwindow',
    h2('.subwindow-toolbar',
      h2('.title', title),
      (opts && opts.help) ? h2('a.help', { href: '#', onclick: onhelp }, com.icon('question-sign')) : '',
      h2('a', { href: '#', onclick: oncollapsetoggle }, collapseToggleIcon),
      h2('a.close', { href: '#', onclick: onclose }, com.icon('remove'))
    ),
    h2('.subwindow-body', el)
  )
  document.body.appendChild(subwindow)

  subwindow.enableClose = function () { canclose = true }
  subwindow.disableClose = function () { canclose = false }

  subwindow.collapse = function () {
    subwindow.classList.add('collapsed')
    collapseToggleIcon.classList.remove('glyphicon-chevron-down')
    collapseToggleIcon.classList.add('glyphicon-chevron-up')
    reflow()
  }
  subwindow.expand = function () {
    subwindow.classList.remove('collapsed')
    collapseToggleIcon.classList.remove('glyphicon-chevron-up')
    collapseToggleIcon.classList.add('glyphicon-chevron-down')
    reflow()
  }

  subwindow.close = function (force) {
    if (!canclose)
      return

    // check if there are any forms in progress
    if (!force) {
      var els = Array.prototype.slice.call(subwindow.querySelectorAll('textarea'))
      for (var i=0; i < els.length; i++) {
        if (els[i].value) {
          if (!confirm('Lose changes to your draft?'))
            return
          break
        }
      }
    }

    // remove
    document.body.removeChild(subwindow)
    h2.cleanup()
    subwindows.splice(subwindows.indexOf(subwindow), 1)
    reflow()
    subwindow = null
  }

  // handlers

  function onclose (e) {
    e.preventDefault()
    subwindow.close()
  }

  function oncollapsetoggle (e) {
    e.preventDefault()
    if (subwindow.classList.contains('collapsed'))
      subwindow.expand()
    else
      subwindow.collapse()
  }

  function onhelp (e) {
    e.preventDefault()
    makeSubwindow(com.help.helpBody(opts.help), [com.icon('question-sign'), ' ', com.help.helpTitle(opts.help)])
  }

  // manage

  subwindows.push(subwindow)
  reflow()

  return subwindow
}

module.exports.pm = function (opts) {

  // render

  opts = opts || {}
  opts.onpost = onpost
  var form = com.pmForm(opts)
  var sw = makeSubwindow(form, 'Secret Message', { help: 'secret-messages' })
  try { form.querySelector('input').focus() } catch (e) {}

  // handlers

  function onpost () {
    sw.close(true)
  }
}

module.exports.help = function (topic) {
  return makeSubwindow(com.help.helpBody(topic), [com.icon('question-sign'), ' ', com.help.helpTitle(topic)])
}

// reposition subwindows
var SPACING = 10
function reflow () {
  var right = SPACING
  subwindows.forEach(function (sw) {
    sw.style.right = right + 'px'
    if (sw.classList.contains('collapsed'))
      right += 90 + SPACING
    else
      right += 500 + SPACING
  })
}