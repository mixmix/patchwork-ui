# On Using Hyperscript Instead of React

Look, let's just get this out of the way.
You were going to tell me, it's too bad I didn't use React to write Patchwork's UI.
You were, weren't you?
It's alright, I don't mind.
Go ahead and say it!
"You should've used React!"
Let it out!

There, don't you feel better?

I used [hyperscript](http://npmjs.com/package/hyperscript).
Hyperscript is like [Jade](http://jade-lang.com/) in the form of a Javascript function.
You write `h()` and inside you put a selector to define the tag, id, and classes.
Then, optionally, an object of attributes, including event-handlers.
Then, optionally, any number of sub-elements.

It looks like this:

```js
var el = h('#page-nav',
  h('a.button.home', { href: '#/' }, icon('home')),
  h('a.button', { href: '#', onclick: app.ui.navBack }, icon('arrow-left')),
  h('a.button', { href: '#', onclick: app.ui.navForward }, icon('arrow-right')),
  h('a.button', { href: '#', onclick: app.ui.navRefresh }, icon('refresh'))
)

function icon(i) {
  return h('span.glyphicon.glyphicon-'+i)
}
```

And here's all you need to know to use it:

 1. `h()` returns an `Element`.
 2. Instead of templates, you now write functions.
 3. Any event handler you register using `on*` can be unregistered, all at once, with `h.cleanup()`. You should do this when you render a new page, to avoid memory leaks - which you will certainly have from circular references if you didn't call `h.cleanup()`.
 4. Look into `h.context()` if you have a small region of elements which will need event unregistration.