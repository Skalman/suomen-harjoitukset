'use strict';

$( function () {
	$( '#plural-partitive-start' ).on( 'click', function () {
		switch_screen( 'plural-partitive' );
		plural_partitive_start()
			.then( function() {
				switch_screen( 'init' );
			} );
	} );
} );

function plural_partitive_start() {
	return Q.fcall( $.ajax, {
		url: 'resources/plural-partitive.json',
		dataType: 'json'
	} )
	.then( function ( data ) {
		var words = _.map( data.words, _.identity );
		words = words.concat.apply( [], words );
		words = _.shuffle( words );

		return words;
	} )
	.then( plural_partitive_exercise )
	.then( function ( stats ) {
		console.log( 'Exercise done' );
	} )
	.fail( function ( err ) {
		console.error( 'Caught error:', err );
	} );
}

function plural_partitive_exercise( words ) {
	var deferred = Q.defer(),
		promise = deferred.promise;

	console.log( 'Exercise start' );
	$( '#plural-partitive .progress-total' ).text( words.length );

	var stats = {
		questions: words.map( function ( word ) {
			return {
				word: word,
				answer: undefined,
				user_answer: undefined
			};
		} )
	};

	_.each( stats.questions, function ( question, i ) {
		promise = promise.then( function () {
			return plural_partitive_do_one( stats, i );
		} );
	} );

	deferred.resolve( stats );

	return promise;
}

function plural_partitive_do_one( stats, question_index ) {
	var wiki_base = 'https://en.wiktionary.org/w/';

	var q = stats.questions[question_index];

	var $parent = $( '#plural-partitive' );
	function $p( selector ) {
		return $parent.find( selector );
	}

	$p( '.word' ).text( q.word );
	$p( '.progress-current' ).text( question_index + 1 );
	$p( 'input' ).focus();

	return Q.all( [
		// when the form is submitted
		$p( 'form' ).when( 'submit', function immediate_inspector( e ) {
			e.preventDefault();
			// don't resolve empty submissions
			if ( $p( 'input' ).val() === '' ) {
				e.notResolved();
			}
		} ).then( function ( e ) {
			$parent.addClass( 'answered' );
			var a = q.user_answer = $p( 'input' ).val().toLowerCase();
			console.log( 'User submitted:', q.user_answer );
			return a;
		} ),

		// and when we got the HTML from Wiktionary
		mediawiki_get_page_html( wiki_base, q.word )
		.then( function got_html( html ) {
			$parent.addClass( 'retrieved-answer' );
			var a = q.answer = plural_partitive_get_from_html( html );
			$p( '.correct-answer' ).text( a.join( ', ' ) );
			console.log( 'Retrieved ' + (a.length===1 ? 'answer' : a.length+' answers') + ' from Wiktionary' );
			return a;
		} )

	// then show the result
	] ).spread( function ( user_answer, answer ) {
		$parent.addClass(
			_.indexOf( q.answer, q.user_answer ) !== -1 ?
			'answer-correct' :
			'answer-incorrect' );

		$p( 'input' ).attr( 'readonly', '' );
		$p( 'button' ).focus();

		return $p( 'form' ).when( 'submit', function immediate_inspector( e ) {
			e.preventDefault();
		} );
	} ).then( function () {
		$parent.removeClass( 'retrieved-answer answered answer-correct answer-incorrect' );
		$p( 'input' ).removeAttr( 'readonly' ).val( '' );
		$p( '.correct-answer' ).text( '' );
	} );
}

function wiktionary_get_finnish_section( html ) {
	var start, end;
	start = /<span class="mw-headline"[^>]+>Finnish<\/span><\/h2>/.exec( html );
	if ( start ) {
		html = html.substr( start.index + start[0].length );
		end = /<h2/.exec( html );
		if ( end ) {
			html = html.substr( 0, end.index );
		}
		return html;
	} else {
		console.log( 'Could not extract the Finnish section from HTML' );
		return null;
	}
}

function plural_partitive_get_from_html( html ) {
	html = wiktionary_get_finnish_section( html );
	var $cell = $($.parseHTML( '<div>' + html + '</div>' )[0])

		// find the <tr> containing partitive
		.find( 'table.inflection-table tr' )
		.filter( function () {
			return $( this ).find( 'th' ).first().text() === 'partitive';
		} )

		// get the right cell
		.find( 'th + td + td' );

	var variants = _.uniq( $cell.find( 'a' ).map( function () {
		return $( this ).text();
	} ).toArray() );

	return variants;
}