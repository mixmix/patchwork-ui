var h = require('hyperscript')
var com = require('../com')

module.exports = function (phoenix) {

  var subwindows = []

  phoenix.ui.subwindow = function (el, title) {
    // create a context so we can release this window on close
    var h2 = h.context()
    var canclose = true

    // markup

    var collapseToggleIcon = com.icon('minus')
    var subwindow = h2('.subwindow',
      h2('.subwindow-body', el),
      h2('.subwindow-toolbar',
        h2('a', { href: '#', onclick: onclose }, com.icon('remove')),
        h2('a', { href: '#', onclick: oncollapsetoggle }, collapseToggleIcon),
        h2('.title', title)
      )
    )
    document.body.appendChild(subwindow)

    subwindow.enableClose = function () { canclose = true }
    subwindow.disableClose = function () { canclose = false }

    subwindow.collapse = function () {
      subwindow.classList.add('collapsed')
      collapseToggleIcon.classList.remove('glyphicon-minus')
      collapseToggleIcon.classList.add('glyphicon-chevron-up')
      reflow()
    }
    subwindow.expand = function () {
      subwindow.classList.remove('collapsed')
      collapseToggleIcon.classList.remove('glyphicon-chevron-up')
      collapseToggleIcon.classList.add('glyphicon-minus')
      reflow()
    }

    subwindow.close = function () {
      if (!canclose)
        return

      // check if there are any forms in progress
      var els = Array.prototype.slice.call(subwindow.querySelectorAll('textarea'))
      for (var i=0; i < els.length; i++) {
        if (els[i].value) {
          if (!confirm('Lose changes to your draft?'))
            return
          break
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

    // manage

    subwindows.push(subwindow)
    reflow()

    return subwindow
  }

  phoenix.ui.pmSubwindow = function (e) {
    e.preventDefault()

    // render

    var form = com.pmForm(phoenix)
    phoenix.ui.subwindow(form, 'Private Message')
    form.querySelector('input').focus()
  }

  // reposition subwindows
  var SPACING = 10
  function reflow () {
    var right = SPACING
    subwindows.forEach(function (sw) {
      sw.style.right = right + 'px'
      if (sw.classList.contains('collapsed'))
        right += 50 + SPACING
      else
        right += 500 + SPACING
    })
  }
}