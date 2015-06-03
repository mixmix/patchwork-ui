var h = require('hyperscript')

module.exports = function (app) {
  app.setPage('files', h('.row', h('.col-xs-push-2.col-xs-8',
    h('img', { src: '/img/lick-the-door.gif', style: 'display: block; margin: 10px auto; border-radius: 3px;' }),
    h('h2.text-muted.text-center', 'Not Yet Implemented'),
    h('div.text-center', { style: 'margin-top: 20px' },
      h('span', { style: 'background: #fff; border: 1px solid #ccc; padding: 1em' },
        h('strong', 'We\'re sorry!'), ' This page hasn\'t been implemented yet. We\'re working hard to finish it!'))
  )))
}