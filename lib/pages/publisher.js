'use strict'
var h = require('hyperscript')
var o = require('observable')
var ref = require('ssb-ref')
var readdirp = require('readdirp')
var mime = require('mime-types')
var app = require('../app')
var ui = require('../ui')
var u = require('../util')
var modals = require('../ui/modals')
var com = require('../com')
var social = require('../social-graph')


module.exports = function () {
  // markup

  var folderPath = o('/Users/paulfrazee/patchwork')
  var folderData = o()
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
          h('a.pull-right.btn.btn-primary.disabled', 'No Changes')
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
    if (item.stat && item.stat.isFile()) {
      return h('tr',
        h('td.text-muted', 'published'),
        h('td', h('input', { type: 'checkbox', checked: !!item.checked, onchange: oncheck(item) })),
        h('td', h('a', { style: 'padding-left: '+(+depth*20)+'px' }, com.icon('file'), item.path)),
        h('td', mime.lookup(item.name)||''),
        h('td', u.bytesHuman(item.stat.size))
      )
    }

    var rows = []

    if (item.path) {
      var col = h('td.folder',
        { onclick: ontoggle(item) },
        h('span',
          { style: 'padding-left: '+(+depth*20)+'px' },
          com.icon('folder-'+(item.expanded?'open':'close')), item.path
        )
      )
      col.setAttribute('colspan', 3)
      rows.push(h('tr',
        h('td.text-muted', 'published'),
        h('td', h('input', { type: 'checkbox', checked: !!item.checked, onchange: oncheck(item) })),
        col
      ))
    }
    
    if (item.expanded) {
      if (item.directories)
        rows = rows.concat(item.directories.map(render.bind(null, depth+1)))
      if (item.files)
        rows = rows.concat(item.files.map(render.bind(null, depth+1)))
    }

    return rows
  }

  function setcheck (item, v) {
    item.checked = v
    if (item.directories) {
      for (var i=0; i < item.directories.length; i++)
        setcheck(item.directories[i], v)
    }
    if (item.files) {
      for (var i=0; i < item.files.length; i++)
        setcheck(item.files[i], v)
    }
  }

  // handlers

  function onfolderchange () {
    folderPath(folderInput.files[0].path)
  }

  folderPath(function (path) {
    if (!path)
      return
    readdirp({ root: path, depth: 0 }, function (err, data) {
      data.expanded = true
      setcheck(data, true)
      folderData(data)
    })
  })

  function oncheck (item) {
    return function () {
      setcheck(item, !item.checked)
      folderData(folderData())
    }
  }

  function ontoggle (item) {
    return function () {
      item.expanded = !item.expanded
      if (item.directories || item.files)
        folderData(folderData())
      else {
        readdirp({ root: item.fullPath, depth: 0 }, function (err, res) {
          item.directories = res.directories
          item.files = res.files
          setcheck(item, !!item.checked)
          folderData(folderData())
        })
      }
    }
  }
}
