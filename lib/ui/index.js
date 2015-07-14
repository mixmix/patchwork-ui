var h = require('hyperscript')
var multicb = require('multicb')
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

  // collect common data
  var done = multicb({ pluck: 1 })
  app.ssb.whoami(done())
  app.ssb.phoenix.getNamesById(done())
  app.ssb.phoenix.getAllProfiles(done())
  app.ssb.phoenix.getActionItems(done())
  app.ssb.phoenix.getIndexCounts(done())
  app.ssb.gossip.peers(done())
  done(function (err, data) {
    if (err) throw err.message
    app.user.id = data[0].id
    app.users.names = data[1]
    app.users.profiles = data[2]
    app.actionItems = data[3]
    app.indexCounts = data[4]
    app.peers = data[5]
    var userProf = app.user.profile = app.users.profiles[app.user.id]

    // refresh suggest options for usernames
    app.suggestOptions['@'] = []
    for (var k in app.users.profiles) {
      if (k == userProf.id || (userProf.assignedTo[k] && userProf.assignedTo[k].following)) {
        var name = app.users.names[k] || k
        app.suggestOptions['@'].push({
          id: k,
          cls: 'user',        
          title: name,
          image: com.profilePicUrl(k),
          subtitle: name,
          value: name
        })
      }
    }

    // re-route to setup if needed
    if (!app.users.names[app.user.id]) {
      _hideNav = true
      if (window.location.hash != '#/setup') {      
        window.location.hash = '#/setup'
        return
      }
    } else
      _hideNav = false

    // lookup the page
    var page = pages[app.page.id]

    // cleanup the old page
    h.cleanup()
    window.onscroll = null // commonly used for infinite scroll
    _onPageTeardown && _onPageTeardown()
    _onPageTeardown = null

    // render the page
    if (!page)
      page = pages.notfound
    page()

    // clear or re-render pending messages
    if (app.page.id == 'home')
      setNewMessageCount(0)
    else
      setNewMessageCount(getNewMessageCount())

    // metrics!
    pleaseWait(false)
    console.debug('page loaded in', (Date.now() - starttime), 'ms')
  })
}

// update ui to show new messages are available
var newMessageCount = 0
var getNewMessageCount =
module.exports.getNewMessageCount = function () {
  return newMessageCount
}
var setNewMessageCount =
module.exports.setNewMessageCount = function (n) {
  n = (n<0)?0:n
  newMessageCount = n
  var name = app.users.names[app.user.id] || 'New Account'
  var homebtn = document.querySelector('#page-nav .home')
  try {
    if (n) {
      document.title = '-=[ ('+n+') Patchwork : '+name+' ]=-'
      homebtn.classList.add('has-unread')
      homebtn.querySelector('.unread').innerHTML = n
    } else {
      document.title = '-=[ Patchwork : '+name+' ]=-'
      homebtn.classList.remove('has-unread')
    }
  } catch (e) {
    // ignore
  }
}

function renderNav () {
  var navEl = document.getElementById('page-nav')    
  if (_hideNav) {
    navEl.style.display = 'none'
  } else {
    navEl.style.display = 'block'
    navEl.innerHTML = ''   
    navEl.appendChild(com.pagenav())
  }
}
module.exports.renderNav = u.debounce(function () {
  app.ssb.phoenix.getIndexCounts(function (err, counts) {
    if (counts)
      app.indexCounts = counts
    renderNav()
  })
}, 150)

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
    opts = {}
  }

  var dropdown = h('.dropdown',
    { onmouseleave: die },
    options.map(function (o) {
      if (o.separator)
        return h('hr')
      return h('a', { href: '#', onclick: onselect(o.value) }, o.label)
    })
  )
  if (opts.width)
    dropdown.style.width = opts.width + 'px'

  var rect = el.getClientRects()[0]
  dropdown.style.top = (rect.bottom + document.body.scrollTop + 10 + (opts.offsetY||0)) + 'px'
  dropdown.style.left = (rect.left + document.body.scrollLeft - 20 + (opts.offsetX||0)) + 'px'
  document.body.appendChild(dropdown)

  function onselect (value) {
    return function (e) {
      e.preventDefault()
      cb(value)
      die()
    }
  }
  function die () {
    if (dropdown)
      document.body.removeChild(dropdown)
    dropdown = null
  }
}