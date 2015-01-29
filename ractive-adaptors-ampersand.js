/*

	Ampersand adaptor plugin
	=======================

	Version 0.1.0. Copyright 2015 Mike Pennisi, MIT licensed.

	This plugin allows Ractive.js to work seamlessly with Amperand's State
	classes (ampersand-state, ampersand-model, ampersand-collection, and
	amperand-rest-collection).

	==========================

	Usage: Include this file on your page below Ractive, e.g:

	    <script src='lib/ractive.js'></script>
	    <script src='lib/ractive-adaptors-ampersand.js'></script>

	...and inside your application:

		window.Ractive.adaptors.Ampersand = window.RactiveAdaptorsAmpersand;

	Or, if you're using a module loader, require this module:

	    define( function ( require ) {
	      var Ractive = require( 'ractive' );

	      Ractive.adapters.Ampersand = require( 'ractive-adaptors-ampersand' );
	    });

	Then tell Ractive to expect Ractive objects by adding an `adapt` property:

	    var ractive = new Ractive({
	      el: myContainer,
	      template: myTemplate,
	      data: { foo: myAmpersandModel, bar: myAmpersandCollection },
	      adapt: [ 'Ampersand' ]
	    });

*/

(function ( global, factory ) {

	'use strict';

	// Common JS (i.e. browserify) environment
	if ( typeof module !== 'undefined' && module.exports && typeof require === 'function' ) {
		module.exports = factory();
	}

	// AMD?
	else if ( typeof define === 'function' && define.amd ) {
		define( factory );
	}

	// browser global
	else {
		window.RactiveAdaptorsAmpersand = factory();
	}

}( typeof window !== 'undefined' ? window : this, function () {

	'use strict';

	var lockProperty = '_ractiveAdaptorsAmpersandLock';
	var Adaptor, ModelWrapper, CollectionWrapper;

	function acquireLock( key ) {
		key[lockProperty] = ( key[lockProperty] || 0 ) + 1;
		return function release() {
			key[lockProperty] -= 1;
			if ( !key[lockProperty] ) {
				delete key[lockProperty];
			}
		};
	}

	function isLocked( key ) {
		return !!key[lockProperty];
	}

	function isModel( object ) {
		return object && typeof object.getType === 'function' &&
			object.getType() === object[object.typeAttribute];
	}

	Adaptor = {
		filter: function ( object ) {
			return object && (object.isCollection || isModel( object ));
		},
		wrap: function ( ractive, object, keypath, prefix ) {
			if (object.isCollection) {
				return new CollectionWrapper( ractive, object, keypath, prefix );
			} else {
				return new ModelWrapper( ractive, object, keypath, prefix );
			}
		}
	};

	ModelWrapper = function( ractive, model, keypath, prefix ) {
		this.value = model;

		model.on( 'change', this.modelChangeHandler = function () {
			var release = acquireLock( model );
			ractive.set( prefix( model.changedAttributes() ) );
			release();
		});
	};

	ModelWrapper.prototype = {
		teardown: function () {
			this.value.off( 'change', this.modelChangeHandler );
		},
		get: function () {
			return this.value;
		},
		set: function ( keypath, value ) {
			// Only set if the model didn't originate the change itself, and
			// only if it's an immediate child property
			if ( !isLocked( this.value ) && keypath.indexOf( '.' ) === -1 ) {
				// If the attribute value is a Collection that has not actually
				// changed, setting it with `Model#set` will translate to an
				// eventual `Collection#set`, which will trigger unecessary
				// `add` and `remove` events.
				if (this.value.get(keypath) === value) {
					return;
				}

				this.value.set( keypath, value );
			}
		},
		reset: function ( object ) {
			// If the new object is an Ampersand model, assume this one is
			// being retired. Ditto if it's not a model at all
			if ( isModel( object ) || !(object instanceof Object)) {
				return false;
			}

			// Otherwise if this is a POJO, reset the model
			this.value.set( object );
		}
	};

	CollectionWrapper = function ( ractive, collection, keypath ) {
		this.value = collection;

		collection.on( 'add remove reset sort', this.changeHandler = function () {
			// TODO smart merge. It should be possible, if awkward, to trigger smart
			// updates instead of a blunderbuss .set() approach
			var release = acquireLock( collection );
			ractive.set( keypath, collection.models );
			release();
		});
	};

	CollectionWrapper.prototype = {
		teardown: function () {
			this.value.off( 'add remove reset sort', this.changeHandler );
		},
		get: function () {
			return this.value.models;
		},
		reset: function ( models ) {
			if ( isLocked( this.value ) ) {
				return;
			}

			// If the new object is an Ampersand collection, assume this one is
			// being retired. Ditto if it's not a collection at all
			if ( models.isCollection || Object.prototype.toString.call( models ) !== '[object Array]' ) {
				return false;
			}

			// Otherwise if this is a plain array, reset the collection
			this.value.reset( models );
		}
	};

	return Adaptor;
}));
