/*
Usage:

$('#my-btn').when( 'click', function (e) {
	if ( ... some condition ... ) {
		// this event promise has *not* been resolved yet
		// it won't continue this time, but perhaps with the next click
		e.notResolved();
		e.preventDefault(); // this is the only place where you can preventDefault()!
	}
} ).orWhen( $('#my-other-btn'), 'click', function (e) { ... } )
.then( function () {
	... your code ...
} );

Accepts arguments very similar to $(...).on() or .one(), except for the last callback.

Additionally, a function may be passed as the last parameter as an *immediate* inspector, receiving the `$.Event` object.

* This is the *only* way to `preventDefault()`, and `stopPropagation()`
* The `$.Event` object is extended with an additional method: `notResolved()`. Calling this method will cause 
to check whether an event really does resolve the promise.

*/

(function ( $, Q ) {

	$.fn.when = function () {
		var deferred = Q.defer(),
			promise = $.extend( {}, deferred.promise ),
			args = $.makeArray(arguments),
			eventsArgs = [ makeEventArgs( this, args, resolve ) ];

		this.on.apply( this, args );

		promise.orWhen = function orWhen( $this ) {
			var args = $.makeArray( arguments );
			args.shift(); // first is $this
			eventsArgs.push( makeEventArgs( $this, args, resolve ) );
			$this.on.apply( $this, args );
			return promise;
		}


		function resolve( e ) {
			deferred.resolve( e );

			// turn off all events
			for ( var i = 0; i < eventsArgs.length; i++ ) {
				// $.apply is the same as Function.prototype.apply
				// Basically, eventsArgs[i][0].off( ...eventsArgs[i][1] )
				$.apply.apply( $.fn.off, eventsArgs[i] );
			}
		}

		return promise;
	};

	function getCallback( $this, immediateInpector, resolver ) {
		return function callback( e ) {
			var isResolved = true;
			if ( immediateInpector ) {
				e.notResolved = function () {
					isResolved = false;
				};
				immediateInpector( e );
			}
			if ( isResolved ) {
				resolver( e );
			}
		};
	}

	function makeEventArgs( $this, args, resolver ) {
		var immediateInpector;

		// an immediate inspector is the last argument if it's present
		if ( $.isFunction( args[args.length - 1] ) ) {
			immediateInpector = args.pop();
		}
		args.push( getCallback( $this, immediateInpector, resolver ) );

		return [ $this, args ];
	}

}( jQuery, Q ));
