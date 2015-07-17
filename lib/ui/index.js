var h = require('hyperscript')
var router = require('phoenix-router')
var app = require('../app')
var com = require('../com')
var u = require('../util')
var pages = require('../pages')
var _onPageTeardown, _hideNav = false

// re-renders the page
var refreshPage =
module.exports.refreshPage = function (e) {
  e && e.preventDefault()
  var starttime = Date.now()
  pleaseWait(true, 1000)

  // run the router
  var route = router('#'+(location.href.split('#')[1]||''), 'home')
  app.page.id    = route[0]
  app.page.param = route[1]
  app.page.qs    = route[2] || {}

  // update state
  app.fetchLatestState(function() {

    // re-route to setup if needed
    if (!app.users.names[app.user.id]) {
      _hideNav = true
      if (window.location.hash != '#/setup') {      
        window.location.hash = '#/setup'
        return
      }
    } else
      _hideNav = false

    // cleanup the old page
    h.cleanup()
    window.onscroll = null // commonly used for infinite scroll
    _onPageTeardown && _onPageTeardown()
    _onPageTeardown = null

    // render the new page
    var page = pages[app.page.id]
    if (!page)
      page = pages.notfound
    page()

    // clear pending messages, if home
    if (app.page.id == 'home')
      app.observ.newPosts(0)

    // metrics!
    pleaseWait(false)
    console.debug('page loaded in', (Date.now() - starttime), 'ms')
  })
}

var renderNav =
module.exports.renderNav = function () {
  var navEl = document.getElementById('page-nav')    
  if (_hideNav) {
    navEl.style.display = 'none'
  } else {
    navEl.style.display = 'block'
    navEl.innerHTML = ''   
    navEl.appendChild(com.pagenav())
  }
}

// render a new page
module.exports.setPage = function (name, page, opts) {
  if (opts && opts.onPageTeardown)
    _onPageTeardown = opts.onPageTeardown

  // render nav
  renderNav()

  // render page
  var pageEl = document.getElementById('page-container')
  pageEl.innerHTML = ''
  if (!opts || !opts.noHeader)
    pageEl.appendChild(com.page(name, page))
  else
    pageEl.appendChild(h('#page.'+name+'-page', page))

  // scroll to top
  window.scrollTo(0, 0)
}

module.exports.navBack = function (e) {
  e.preventDefault()
  e.stopPropagation()
  window.history.back()
}
module.exports.navForward = function (e) {
  e.preventDefault()
  e.stopPropagation()
  window.history.forward()
}
module.exports.navRefresh = function (e) {
  e.preventDefault()
  e.stopPropagation()
  refreshPage()
}  


var oldScrollTop
module.exports.disableScrolling = function () {
  oldScrollTop = document.body.scrollTop
  document.querySelector('html').style.overflow = 'hidden'
  window.scrollTo(0, oldScrollTop)
}
module.exports.enableScrolling = function () {
  document.querySelector('html').style.overflow = 'auto'
  window.scrollTo(0, oldScrollTop)
}


var setStatus =
module.exports.setStatus = function (type, message) {
  var status = document.getElementById('app-status')
  status.innerHTML = ''
  if (type)
    status.appendChild(h('.alert.alert-'+type, message))
}
module.exports.notice = function (type, message, duration) {
  setStatus(type, message)
  setTimeout(setStatus, duration || 15e3)
}


var pleaseWaitTimer, uhohTimer, tooLongTimer
var pleaseWait =
module.exports.pleaseWait = function (enabled, after) {
  function doit() {
    // clear main timer
    clearTimeout(pleaseWaitTimer); pleaseWaitTimer = null

    if (enabled === false) {
      // hide spinner
      document.querySelector('#please-wait').style.display = 'none'
      setStatus(false)

      // clear secondary timers
      clearTimeout(uhohTimer); uhohTimer = null
      clearTimeout(tooLongTimer); tooLongTimer = null
    }
    else {
      // show spinner
      document.querySelector('#please-wait').style.display = 'block'

      // setup secondary timers
      uhohTimer = setTimeout(function () {
        setStatus('warning', 'Hmm, this seems to be taking a while...')
      }, 5e3)
      tooLongTimer = setTimeout(function () {
        setStatus('danger', 'I think something broke :(. Please restart Patchwork and let us know if this keeps happening!')
      }, 20e3)
    }
  }

  // disable immediately
  if (!enabled)
    return doit()

  // enable immediately, or after a timer (if not already waiting)
  if (!after)
    doit()
  else if (!pleaseWaitTimer)
    pleaseWaitTimer = setTimeout(doit, after)
}


module.exports.dropdown = function (el, options, opts, cb) {
  if (typeof opts == 'function') {
    cb = opts
    opts = null
  }
  opts = opts || {}

  // render
  var dropdown = h('.dropdown'+(opts.cls||'')+(opts.right?'.right':''),
    { onmouseleave: die },
    options.map(function (o) {
      if (o instanceof HTMLElement)
        return o
      if (o.separator)
        return h('hr')
      return h('a.item', { href: '#', onclick: onselect(o.value) }, o.label)
    })
  )
  if (opts.width)
    dropdown.style.width = opts.width + 'px'

  // position off the parent element
  var rect = el.getClientRects()[0]
  dropdown.style.top = (rect.bottom + document.body.scrollTop + 10 + (opts.offsetY||0)) + 'px'
  if (opts.right)
    dropdown.style.left = (rect.right + document.body.scrollLeft - (opts.width||200) + 5 + (opts.offsetX||0)) + 'px'
  else
    dropdown.style.left = (rect.left + document.body.scrollLeft - 20 + (opts.offsetX||0)) + 'px'

  // add to page
  document.body.appendChild(dropdown)
  document.body.addEventListener('click', die)

  // handler
  function onselect (value) {
    return function (e) {
      e.preventDefault()
      cb(value)
      die()
    }
  }
  function die () {
    document.body.removeEventListener('click', die)
    if (dropdown)
      document.body.removeChild(dropdown)
    dropdown = null
  }
}