/*
Usage:

$('#my-btn').when( 'click', function (e) {
	if ( ... some condition ... ) {
		// this event promise has *not* been resolved yet
		// it won't continue this time, but perhaps with the next click
		e.notResolved();
		e.preventDefault(); // this is the only place where you can preventDefault()!
	}
} ).then( function () {
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
		var immediateInpector,
			deferred = Q.defer(),
			promise = deferred.promise,
			$this = this,
			args = $.makeArray( arguments );

		// an immediate inspector is the last argument if it's present
		if ( $.isFunction( args[args.length - 1] ) ) {
			immediateInpector = args.pop();
		}

		args.push( callback );

		$this.on.apply( $this, args );

		function callback( e ) {
			var isResolved = true;
			if ( immediateInpector ) {
				e.notResolved = function () {
					isResolved = false;
				};
				immediateInpector( e );
			}
			if ( isResolved ) {
				$this.off.apply( $this, args );
				deferred.resolve( e );
			}
		}

		return promise;
	};

	$.fn.later = function () {
		var $this = this,
			args = $.makeArray( arguments );
		return function () {
			return $this.when.apply( $this, args );
		};
	};

}( jQuery, Q ));
