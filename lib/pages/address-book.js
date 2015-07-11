'use strict'
var h = require('hyperscript')
var multicb = require('multicb')
var ref = require('ssb-ref')
var com = require('../com')
var u = require('../util')
var social = require('../social-graph')

module.exports = function (app) {
  var queryStr = app.page.qs.q || ''
  var queryRegex
  
  // filters

  function stdfilter (prof) {
    if (prof.id == app.user.id) // is self
      return true
    if (app.users.names[prof.id] || social.follows(app, app.user.id, prof.id)) // has a name, or is a friend
      return true
  }

  function isRecommended (prof) {
    var nfollowers = social.followedFollowers(app, app.user.id, prof.id).length
    var nflaggers  = social.followedFlaggers(app, app.user.id, prof.id, true).length
    if (prof.id != app.user.id && !social.follows(app, app.user.id, prof.id) && nfollowers && !nflaggers)
      return true
  }

  function searchFilterFn (prof) {
    if (!stdfilter(prof))
      return false
    var author = app.users.names[prof.id] || prof.id
    if (!queryRegex.exec(author))
      return false
    return true
  }

  function recommendFilterFn (prof) {
    if (!stdfilter(prof))
      return false
    return isRecommended(prof)
  }

  function friendsFilterFn (prof) {
    if (!stdfilter(prof))
      return false
    return social.follows(app, app.user.id, prof.id)
  }

  function othersFilterFn (prof) {
    if (!stdfilter(prof))
      return false
    return (prof.id != app.user.id && !social.follows(app, app.user.id, prof.id) && !isRecommended(prof))
  }

  // markup

  var searchForm = h('form', { onsubmit: onsearch }, h('input.form-control', { name: 'search', placeholder: 'Type their username or lookup code.' }))
  var listing = h('div')
  app.setPage('address-book', h('.layout-onecol',
    h('.address-book-controls',
      h('.search', h('h4', com.icon('search'), ' Find a Friend'), searchForm),
      h('.getcode', { onclick: app.ui.lookupHelpModal },  h('h4', com.icon('hand-right'), ' Can\'t find your friend?'), h('p', 'Click here for instructions to use a lookup code.'))),
    listing
  ))
  renderListing()

  function renderListing () {
    listing.innerHTML = ''
    if (queryRegex) {
      // show current query
      listing.appendChild(
        h('h3',// { style: 'margin: 15px' },
          'Searching for "'+queryStr+'". ',
          h('small', h('a', { href: '#', onclick: onunsearch }, com.icon('remove'), ' Clear Search'))
        )
      )
      // show results
      listing.appendChild(com.contactFeed(app, { filter: searchFilterFn }))
      listing.appendChild(h('p',
        { style: 'margin-top: 30px; background: #fafafa; padding: 10px; border-radius: 4px; color: #555;' },
        'ProTip: Can\'t find your friend? Ask them to send you a lookup code.'
      ))
    }
    else {
      // show collected lists
      listing.appendChild(h('h3', 'Recommendations'))
      listing.appendChild(com.contactFeed(app, { filter: recommendFilterFn }))
      listing.appendChild(h('h3', { style: 'margin-top: 40px' }, 'Currently Following'))
      listing.appendChild(com.contactFeed(app, { filter: friendsFilterFn }))
      listing.appendChild(h('h3', { style: 'margin-top: 40px' }, 'Others'))
      listing.appendChild(com.contactFeed(app, { filter: othersFilterFn }))
    }
  }

  // handlers

  var lookupcodeRegex = /([a-z0-9\/\+\=]+\.[a-z0-9]+)(?:\[via\])?(.+)?/i
  function islookupcode (str) {
    var parts = lookupcodeRegex.exec(str)
    return (parts && ref.isFeedId(parts[1]))
  }

  function onsearch (e) {
    e.preventDefault()
    queryStr = searchForm.search.value
    if (islookupcode(queryStr)) {
      queryRegex = null
      app.ui.useLookupModal(queryStr)
    } else {
      queryRegex = new RegExp(queryStr.replace(/\s+/g, '|'), 'i')
    }
    renderListing()
  }
  function onunsearch (e) {
    e.preventDefault()
    searchForm.search.value = queryStr = ''
    queryRegex = null
    renderListing()
  }
}
