var h = require('hyperscript')
var com = require('./index')

module.exports = function (app, stats, opts) {

  // markup

  stats = stats || {}
  var upvoted   = (stats.uservote ===  1) ? '.selected' : ''
  var downvoted = (stats.uservote === -1) ? '.selected' : ''

  return h('.message-stats',
    h('span.stat',
      h('a.upvote'+upvoted, { href: '#', onclick: (opts && opts.handlers) ? onupvote : null  }, com.icon('triangle-top')),
      h('span.votes', { 'data-amt': stats.votes||0 }),
      h('a.downvote'+downvoted, { href: '#', onclick: (opts && opts.handlers) ? ondownvote : null }, com.icon('triangle-bottom'))),
    h('span.stat.comments', { 'data-amt': stats.comments||0 }, com.icon('comment')))

  // handlers

  function onupvote (e) {
    e.preventDefault()
    console.log('todo')
  }

  function ondownvote (e) {
    e.preventDefault()
    console.log('todo')
  }
}