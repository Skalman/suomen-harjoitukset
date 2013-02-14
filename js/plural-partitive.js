'use strict';

$( function () {
	$( '#plural-partitive-start' ).on( 'click', function () {
		switch_screen( 'plural-partitive' );
		plural_partitive_start();
	} );
} );

function plural_partitive_start() {
	console.log( 'plural_partitive_start' );


	Q.fcall( $.ajax, {
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

	var stats = {
		questions: words.map( function ( word ) {
			return {
				word: word,
				answer: undefined,
				user_answer: undefined
			}
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
	var deferred = Q.defer();
	var wiki_base = 'https://en.wiktionary.org/w/';

	var q = stats.questions[question_index];

	var $parent = $( '#plural-partitive' );
	function $p( selector ) {
		return $parent.find( selector );
	}

	$p( '.word' ).text( q.word );
	$p( 'form' ).on( 'submit', submitted );
	$p( 'input' ).focus();

	mediawiki_get_page_html( wiki_base, q.word )
		.then( got_html );


	function got_html( html ) {
		var a = q.answer = plural_partitive_get_from_html( html );
		$parent.addClass( 'retrieved-answer' );
		$p( '.correct-answer' ).text( a.join( ', ' ) );
		console.log( a.length === 1 ? 'Retrieved answer' : 'Retrieved ' + a.length + ' answers' );
		show_ans();
	}

	function submitted( e ) {
			e.preventDefault();
			q.user_answer = $p( 'input' ).val();

			// ignore empty submissions
			if ( q.user_answer ) {
				$parent.addClass( 'answered' );
				$( this ).off( 'submit', submitted );
				console.log( 'User submitted:', q.user_answer );
				show_ans();
			}
		}

	function show_ans() {
		if ( q.answer && q.user_answer ) {
			if ( _.indexOf( q.answer, q.user_answer ) !== -1 ) {
				$parent.addClass( 'answer-correct' );
			} else {
				$parent.addClass( 'answer-incorrect' );
			}
			$p( 'form' ).on( 'submit', next );
			$p( 'input' ).attr( 'readonly', '' );
			$p( 'button' ).focus();
		}
	}

	function next( e ) {
		e.preventDefault();
		$parent.removeClass( 'retrieved-answer answered answer-correct answer-incorrect' );
		$( this ).off( 'submit', next );
		$p( 'input' ).removeAttr( 'readonly' ).val( '' );
		$p( '.correct-answer' ).text( '' );
		deferred.resolve( stats );
	}

	return deferred.promise;
}

function wiktionary_get_finnish_section( html ) {
	var start, end;
	start = /<span class="mw-headline"[^>]+>Finnish<\/span><\/h2>/.exec( html );
	if ( start ) {
		html = html.substr( start.index + start[0].length );
		end = /<h2/.exec( html );
		if ( end ) {
			html = html.substr( 0, end.index )
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