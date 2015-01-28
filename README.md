
Ractive.js Ampersand adaptor
============================

Use Ampersand State classes (`ampersand-state`, `ampersand-model`,
`ampersand-collection`, and `ampersand-rest-collection`) in your [Ractive]
components.<br>

*Find more Ractive.js plugins at 
[docs.ractivejs.org/latest/plugins](http://docs.ractivejs.org/latest/plugins)*

## Installation

To use this adaptor, you will need to load the script, attach it to your
applications `Ractive` function, and then create Ractive instances that
reference it.

### 1. Inclusion

**Via script tag:** Include `ractive-adaptors-ampersand.min.js` on
your page below Ractive, e.g:

```html
<script src='lib/ractive.js'></script>
<script src='lib/ractive-adaptors-ampersand.min.js'></script>
```

**Via AMD:**

```js
define(['ractive', 'ractive-adaptors-ampersand'],
  function(Ractive, RactiveAdaptorsAmpersand) {
    // See "2. Attaching" below
});
```

**Via CommonJS:**

```js
var Ractive = require('ractive');
var RactiveAdaptorsAmpersand = require('ractive-adaptors-ampersand');

// See "2. Attaching" below
```

### 2. Attaching

However you include the script, attaching to Ractive will look similar:

```js
window.Ractive.adaptors.Ampersand = window.RactiveAdaptorsAmpersand;
```

### 3. Activating

```js
var myRactive = new Ractive({
  adapt: ['Ampersand']
});
```

[Ractive]: http://www.ractivejs.org
