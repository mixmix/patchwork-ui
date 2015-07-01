'use strict'
var h = require('hyperscript')
var multicb = require('multicb')
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
    if (app.users.names[prof.id]) // has a name
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

  var searchForm = h('form', { onsubmit: onsearch }, h('input.form-control', { name: 'search' }))
  var listing = h('div')
  app.setPage('address-book', h('.layout-onecol',
    h('.address-book-controls',
      h('.search', h('h4', com.icon('search'), ' Search your Network'), searchForm),
      h('.create-invite', { onclick: swal.bind(null, 'Not Yet Implemented', 'We\'re sorry! This feature hasn\'t been implemented yet. We\'re working hard to finish it!', 'error') },  h('h4', com.icon('send'), ' Invite a Friend'), h('p', 'Bring a new user into your network')),
      h('.use-invite', { onclick: app.ui.inviteModal },  h('h4', com.icon('ok'), ' Accept Invitation'), h('p', 'Join a friend in their network'))),
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

  function onsearch (e) {
    e.preventDefault()
    queryStr = searchForm.search.value
    queryRegex = new RegExp(queryStr.replace(/\s/g, '|'))
    renderListing()
  }
  function onunsearch (e) {
    e.preventDefault()
    searchForm.search.value = queryStr = ''
    queryRegex = null
    renderListing()
  }
}
