# On Using Hyperscript Instead of React

Look, let's just get this out of the way.
You were going to tell me, it's too bad I didn't use React to write Patchwork's UI.
You were, weren't you?
It's alright, I don't mind.
Go ahead and say it!
"You should've used React!"
Let it out!

There, don't you feel better?


I didn't chose React because:

 - I don't have a performance problem.
 - I don't have a data-flow problem.
 - I don't have a code organization problem.
 - I do have a templating problem.

So, I chose [Hyperscript](http://npmjs.com/package/hyperscript).
Hyperscript is like [Jade](http://jade-lang.com/) as a Javascript function.
It looks like this:

```js
var el = h('#page-nav',
  h('a.button.home', { href: '#/' }, icon('home')),
  h('a.button', { onclick: ui.navBack }, icon('arrow-left')),
  h('a.button', { onclick: ui.navForward }, icon('arrow-right')),
  h('a.button', { onclick: ui.navRefresh }, icon('refresh'))
)

function icon(i) {
  return h('span.glyphicon.glyphicon-'+i)
}
```

```js
function renderEntry (entry) {
  if (entry.isDirectory)
    return h('.directory', entry.files.map(renderEntry))
  return h('.file', entry.name)
}
```

```js
var btn = h('a.btn', { onclick: togglePressed }, h('span.glyphicon.glyphicon-ok'))
function togglePressed (e) {
  btn.classList.toggle('pressed')
}
```

```js
var com = require('./lib/com')
function profilePage (userId) {
  return com.layout.twocol(
    com.layout.main(com.messageFeed({ author: userId })),
    com.layout.side(
      com.profilePic(userId),
      com.userName(userId),
      com.followControls(userId)
    )
  )
)
```

And that's all there is to it.
It's really not that far off from JSX.

If I decide I want a virtual DOM or reactive data flows, I'll pull in [virtual-hyperscript](https://www.npmjs.com/package/virtual-hyperscript) or [observable](https://www.npmjs.com/package/observable).
I kind of doubt I will, though!