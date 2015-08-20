'use strict'
var h      = require('hyperscript')
var o      = require('observable')
var ref    = require('ssb-ref')
var mime   = require('mime-types')
var pwt    = require('published-working-tree')
var app    = require('../app')
var ui     = require('../ui')
var u      = require('../util')
var modals = require('../ui/modals')
var com    = require('../com')
var social = require('../social-graph')

// symbols, used to avoid collisions with filenames
var ISROOT = Symbol('isroot')
var ISOPEN = Symbol('isopen')

module.exports = function () {

  // markup

  var folderPath = o('/Users/paulfrazee/.ssb')
  var folderData = o()

  var publishBtn
  var folderInput = h('input.hidden', { type: 'file', webkitdirectory: true, directory: true, onchange: onfolderchange })
  ui.setPage('publisher', h('.layout-onecol',
    h('.layout-main',
      h('h3', h('strong', 'Your Site')),
      h('form',
        h('p', 
          folderInput,
          h('a.btn.btn-3d', { onclick: folderInput.click.bind(folderInput) }, 'Select Folder'),
          ' ',
          h('span.files-view-folder', folderPath),
          publishBtn = o.transform(folderData, function (d) {
            var c = pwt.changes(d)
            if (!c.adds.length && !c.dels.length && !c.mods.length)
              return h('a.pull-right.btn.btn-primary.disabled', 'No Changes')

            var changes = []
            if (c.adds.length) changes.push('+'+c.adds.length)
            if (c.dels.length) changes.push('-'+c.dels.length)
            if (c.mods.length) changes.push('^'+c.mods.length)
            changes = changes.join(', ')
            return h('a.pull-right.btn.btn-primary', 'Publish ('+changes+')')
          })
        ),
        o.transform(folderData, function (fd) {
          if (!fd)
            return
          return h('table.files-view',
            h('tbody', render(-1, fd))
          )
        })
      )
    )
  ))

  function render (depth, item) {
    if (item[pwt.TYPE] == 'file') {
      return h('tr',
        h('td', getstate(item)),
        h('td', h('input', { type: 'checkbox', checked: item[pwt.ACTIVE], onchange: oncheck(item) })),
        h('td', 
          h('a', { style: 'padding-left: '+(+depth*20)+'px' }, com.icon('file'), item[pwt.NAME]), ' ',
          item[pwt.DELETED]  ? h('em.text-muted', 'not on disk') : '',
          item[pwt.MODIFIED] ? h('em.text-muted', 'modified') : ''
        ),
        h('td', mime.lookup(item[pwt.NAME])||''),
        h('td', item[pwt.STAT] && u.bytesHuman(item[pwt.STAT].size))
      )
    }

    var rows = []

    if (!item[ISROOT]) {
      var col = h('td.folder',
        { onclick: ontoggle(item) },
        h('span',
          { style: 'padding-left: '+(+depth*20)+'px' },
          com.icon('folder-'+(item[ISOPEN]?'open':'close')), item[pwt.NAME], ' ',
          item[pwt.DELETED]  ? h('em.text-muted', 'not on disk') : '',
          item[pwt.MODIFIED] ? h('em.text-muted', 'modified') : ''
        )
      )
      col.setAttribute('colspan', 3)
      rows.push(h('tr',
        h('td', getstate(item)),
        h('td', h('input', { type: 'checkbox', checked: item[pwt.ACTIVE], onchange: oncheck(item) })),
        col
      ))
    }
    
    // render folders, then files
    if (item[ISOPEN]) {
      for (var k in item)
        if (item[k][pwt.TYPE] == 'directory')
          rows.push(render(depth + 1, item[k]))
      for (var k in item)
        if (item[k][pwt.TYPE] == 'file')
          rows.push(render(depth + 1, item[k]))
    }

    return rows
  }

  function setactive (item, v) {
    item[pwt.ACTIVE] = v
    for (var k in item)
      setactive(item[k], v)
  }

  function getstate (item) {
    return ({ add: 'add', mod: 'update', del: 'remove' })[pwt.change(item)] || ''
  }

  // handlers

  function onfolderchange () {
    folderPath(folderInput.files[0].path)
  }

  folderPath(function (path) {
    if (!path)
      return
    ui.pleaseWait(true, 100)
    pwt.loadworking(path, null, function (err, data) {
      ui.pleaseWait(false)
      data[ISROOT] = true
      data[ISOPEN] = true
      console.log(data)
      folderData(data)
    })
  })

  function oncheck (item) {
    return function () {
      var newcheck = !item[pwt.ACTIVE]
      if (newcheck && item[pwt.TYPE] == 'directory' && !item[pwt.DELETED]) {
        // read all of the directory first
        ui.pleaseWait(true, 100)
        pwt.readall(item[pwt.PATH], item, next)
      }
      else next()

      function next() {
        ui.pleaseWait(false)
        setactive(item, newcheck)
        folderData(folderData())
      }
    }
  }

  function ontoggle (item) {
    return function () {
      item[ISOPEN] = !item[ISOPEN]
      if (item[pwt.DIRREAD] || item[pwt.DELETED])
        folderData(folderData())
      else {
        pwt.read(item[pwt.PATH], item, true, function () {
          folderData(folderData())
        })
      }
    }
  }
}
