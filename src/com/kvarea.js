var h = require('hyperscript')

function isNumeric (v) {
  return !isNaN(v)
}

module.exports = function (app, value) {

  // markup
  
  var kvarea = h('table.kvarea', { onkeyup: onkeyup })
  setValue(app, kvarea, value)

  // handlers

  function onkeyup (e) {
    var tbody = kvarea.firstChild
    var tr = e.target.parentNode
    if (tr == tbody.lastChild) {
      // does the last row have text in it?
      if (tr.innerText.trim().length > 0) {
        // add a row
        tbody.appendChild(row('', ''))
      }
    }
  }

  return kvarea
}

var setValue =
module.exports.setValue = function (app, table, value) {
  table.innerHTML = ''
  table.appendChild(h('tbody', rows(value), row('', '')))
}

var getValue =
module.exports.getValue = function (app, table) {
  var obj = {}
  Array.prototype.forEach.call(table.querySelectorAll('tr'), function (tr) {
    var k = tr.firstChild.textContent.trim()
    var v = tr.lastChild.textContent.trim()
    if (!k)
      return
    pathset(obj, k, v)
  })
  return obj
}

function pathset (obj, k, v) {
  k = k.split('.')
  for (var i=0; i < k.length; i++) {
    var k_ = k[i]
    if (!k_)
      return

    if (i + 1 == k.length)
      obj[k_] = v // last item, set value
    else {
      // not last item, descend and create an object if needed
      if (!obj[k_] || typeof obj[k_] != 'object') {
        if (isNumeric(k[i+1]))
          obj[k_] = []
        else
          obj[k_] = {}
      }
      obj = obj[k_]
    }
  }
}

function row (k, v) {
  return h('tr', h('td', {contentEditable: true}, k), h('td', {contentEditable: true}, v))
}

function rows (obj, path) {

  var els = []
  path = (path) ? path + '.' : ''
  for (var k in obj) {
    if (obj[k] && typeof obj[k] == 'object')
      els = els.concat(rows(obj[k], path+k))
    else
      els.push(row(path+k, ''+obj[k]))

  }

  return els 
}



var TAB = 9
function onkeydown (e) {
  if (e.keyCode == TAB) {
    console.log(e.target)
    // e.preventDefault()
  }
}

function onaddrow (e) {
  e.preventDefault()
  testTable.appendChild(h('tr', h('td', { contentEditable: true, onkeydown: onkeydown }), h('td', { contentEditable: true, onkeydown: onkeydown })))
}