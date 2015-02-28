var h = require('hyperscript')

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