/* jshint expr: true */
require( 'mocha-clean/brief' );
var mdescribe = require( 'mocha-repeat' );
var expect    = require( 'chai' ).expect;

var libs = {
	ractive: {
		'0.6.0': require( '../vendor/ractive/ractive-edge.js' ),
		'0.5.8': require( '../vendor/ractive/ractive-0.5.8.js' ),
		'0.5.0': require( '../vendor/ractive/ractive-0.5.0.js' ),
		'0.4.0': require( '../vendor/ractive/ractive-0.4.0.js' ),
	},
	model: {
		'4.0': require( '../vendor/ampersand-model/ampersand-model-4.0' )
	},
	collection: {
		'1.4': require( '../vendor/ampersand-collection/ampersand-collection-1.4' )
	}
};

function tests( name, fn ) {
	mdescribe( 'Ractive', libs.ractive, function ( Ractive, version ) {
		mdescribe( 'Ampersand Model', libs.model, function ( Model, version ) {
			mdescribe( 'Ampersand Collection', libs.collection, function ( Collection, version ) {
				describe( name, function () {
					fn( Ractive, Model, Collection );
				});
			});
		});
	});
}

tests( 'Ractive-adaptors-ampersand', function ( Ractive, Model, Collection ) {
	var Adaptor, TestModel, TestCollection, model, ractive, collection;

	/*
	 * Load the library
	 */

	before(function () {
		Adaptor = require( '..' );

		Ractive.adaptors.Ampersand = Adaptor;
		Ractive.defaults.adapt.push( 'Ampersand' );

		TestCollection = Collection.extend({});
		TestModel = Model.extend({
			props: {
				name: 'string',
				message: 'string'
			},
			collections: {
				sublist: TestCollection
			}
		});
		TestCollection.prototype.model = TestModel;
	});

	/*
	 * Basic sanity tests
	 */

	describe( 'Sanity tests', function () {

		it( 'adaptor exists and is an object', function () {
			expect( Ractive.adaptors.Ampersand ).is.a( 'object' );
		});

		it( 'Model exists', function () {
			expect( Model ).is.a( 'function' );
		});

		it( 'Collection exists', function () {
			expect( Collection ).is.a( 'function' );
		});

	});

	/*
	 * Adaptor filter
	 */

	describe( 'filter', function () {
		it( 'detects models', function () {
			var model = new TestModel();
			expect( Adaptor.filter(model) ).true;
		});

		it( 'detects collections', function () {
			var collection = new Collection();
			expect( Adaptor.filter(collection) ).true;
		});

		it( 'returns false on plain objects', function () {
			var object = {};
			expect( Adaptor.filter(object) ).false;
		});
	});

	/*
	 * Models
	 */

	describe( 'models', function () {
		beforeEach(function () {
			model = new TestModel();
		});

		beforeEach(function () {
			if (Ractive.VERSION === '0.4.0')
				ractive = new Ractive({ adaptor: '' });
			else
				ractive = new Ractive();
		});

		it( 'works', function () {
			ractive.set( 'model', model );
			model.set( 'message', 'hello' );

			expect( ractive.get('model.message') ).eql( 'hello' );
		});

		it( 'sees model values before', function () {
			model = new TestModel({ message: 'hello' });
			ractive.set( 'model', model );

			expect( ractive.get('model.message') ).eql( 'hello' );
		});

		it( 'propagates changes back to the model', function () {
			ractive.set( 'model', model );
			ractive.set( 'model.message', 'hello' );

			expect( ractive.get('model.message') ).eql( 'hello' );
		});

		it( 'accounts for model listeners', function (next) {
			model.on( 'change:message', function ( m, a, b ) {
				next();
			});

			ractive.set( 'model', model );
			ractive.set( 'model.message', 'hello' );
		});

		// See: https://github.com/ractivejs/ractive-adaptors-backbone/pull/12
		it( 'works with POJO reset', function () {
			ractive.set( 'model', model );
			ractive.set( 'model', { message: 'hello' } );

			expect( model.get('message') ).eql( 'hello' );
		});

		it( 'works with setting to `null`', function () {
			ractive.set( 'model', model );
			ractive.set( 'model', null );
		});

		it( 'only notifies about changed attributes', function () {
			ractive.set( 'model', model );

			ractive.observe( '*.*', function (newValue, oldValue, keypath) {
				expect( newValue ).eql( 'foo' );
				expect( oldValue ).eql( undefined );
				expect( keypath ).eql( 'model.message' );
			}, { init: false });

			model.set( 'message', 'foo' );
		});

		it( 'does not trigger change events when re-setting nested models', function () {
			var sublist = model.get('sublist');
			ractive.set( 'model', model );

			model.set('sublist', sublist);
			sublist.on( 'add', function() {
				throw new Error('Unexpected "add" event');
			});
			sublist.on( 'remove', function() {
				throw new Error('Unexpected "remove" event');
			});

			ractive.set( 'model.sublist', sublist );
		});

	});

	/*
	 * Model reset
	 */

	describe( 'resetting to new models', function () {
		var newModel;

		beforeEach(function () {
			ractive = new Ractive({ template: "{{#model}}{{name}}{{/model}}" });
			model = new TestModel({ name: "Louie" });
			newModel = new TestModel({ name: "Miles" });

			ractive.set( 'model', model );
			ractive.set( 'model', newModel );
		});

		it( 'handles resetting to new models', function () {
			expect( ractive.get('model').cid ).eql( newModel.cid );
		});

		it( 'stops listening to old model', function () {
			model.set( 'name', 'Ella' );
			expect( ractive.toHTML() ).eql( 'Miles' );
		});

		it( 'listens to the new model', function () {
			newModel.set( 'name', 'Frank' );
			expect( ractive.toHTML() ).eql( 'Frank' );
		});
	});

	/*
	 * Collections
	 */

	describe( 'collections', function () {
		var MyCollection, list;

		beforeEach(function () {
			MyCollection = Collection.extend({
				model: TestModel
			});
		});

		beforeEach(function () {
			list = new MyCollection();
			ractive = new Ractive({
				template: '{{#list}}{{name}}{{/list}}'
			});
			ractive.set('list', list);
			list.reset( [ { name: 'Moe' }, { name: 'Larry' }, { name: 'Curly' } ] );
		});

		it( 'works', function () {
			expect( ractive.toHTML() ).eql( 'MoeLarryCurly' );
		});

		it( 'responds to model changes', function () {
			var moe = list.at( 0 );
			moe.set( 'name', 'Joe' );
			expect( ractive.toHTML() ).eql( 'JoeLarryCurly' );
		});

		it( 'responds to deletions', function () {
			var moe = list.at( 0 );
			list.remove( moe );
			expect( ractive.toHTML() ).eql( 'LarryCurly' );
		});

		it( 'responds to additions', function () {
			list.add({ name: 'Susy' });
			expect( ractive.toHTML() ).eql( 'MoeLarryCurlySusy' );
		});

		it( 'handles resets to array', function () {
			ractive.set('list', [ { name: 'Homer' }, { name: 'Bart' } ] );
			expect( ractive.toHTML() ).eql( 'HomerBart' );
		});

		it( 'handles resets to another collection', function () {
			var newCollection = new MyCollection([
				{ name: 'George' }, { name: 'Ringo' }
			]);

			ractive.set('list', newCollection);
			expect( ractive.toHTML() ).eql( 'GeorgeRingo' );
		});
	});

	/*
	 * Nested collections
	 */

	describe( 'nested collections', function () {
		var submodel, sublist, list;

		beforeEach(function () {
			list = new TestCollection( [ { sublist: [ { message: 'hello' } ] } ] );
			sublist = list.at(0).get('sublist');
			submodel = sublist.at(0);

			ractive = new Ractive({
				template: '{{#list}}{{heading}}{{#sublist}}{{message}}{{/sublist}}{{/list}}'
			});

			ractive.set('list', list);
		});

		it( 'works', function () {
			expect( ractive.get( 'list.0.sublist.0.message' ) ).eql( 'hello' );
		});

		it( 'renders HTML', function () {
			expect( ractive.toHTML() ).eql( 'hello' );
		});

		it( 'responds to changes in submodel', function () {
			submodel.set( 'message', 'hola' );
			expect( ractive.toHTML() ).eql( 'hola' );
		});

		it( 'responds to sublist additions', function () {
			sublist.add( new TestModel({ message: 'howdy' }) );
			expect( ractive.toHTML() ).eql( 'hellohowdy' );
		});

		it( 'responds to sublist deletions', function () {
			var m = new TestModel({ message: 'howdy' });
			sublist.add(m);
			sublist.remove(m);
			expect( ractive.toHTML() ).eql( 'hello' );
		});
	});

});
