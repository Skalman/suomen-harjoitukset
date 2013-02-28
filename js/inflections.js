'use strict';

var strings = {
	'singular-partitive': {
		instructions: 'Kirjoita sanan yksikön partitiivi'
	},
	'plural-partitive': {
		instructions: 'Kirjoita sanan monikon partitiivi'
	},
	'singular-illative': {
		instructions: 'Kirjoita sanan yksikön illatiivi'
	},
	'plural-illative': {
		instructions: 'Kirjoita sanan monikon illatiivi'
	}
};

$( function () {
	$( '.start' ).on( 'click', function () {
		var $this = $(this);
		var form = $this.data('form');
		console.log( 'Start', form );
		inflections_start( form )
			.then( function() {
				switch_screen( 'init' );
				$this.focus();
			} );
	} );

	// Using promises might not be optimal for UI: a user may interact with the
	// UI in the short time period between a UI promise is resolved and the
	// list
	$( 'form' ).on( 'submit', function ( e ) {
		e.preventDefault();
	} );
} );

function inflections_start( form ) {
	return Q.fcall( $.ajax, {
		url: 'resources/words.json',
		dataType: 'json'
	} )
	.then( function ( data ) {
		var words = _.map( data.words, _.identity );
		words = words.concat.apply( [], words );
		words = _.shuffle( words );

		return words;
	} )
	.then( function ( words ) {
		return inflections_exercise( form, words )
	} )
	.then( function ( stats ) {
		console.log( 'Exercise done' );
	} )
	.fail( function ( err ) {
		console.error( 'Caught error:', err );
	} );
}

function inflections_exercise( form, words ) {
	var deferred = Q.defer(),
		promise = deferred.promise;

	console.log( 'Exercise start' );

	$( '#inflections .instructions' ).text( strings[form].instructions );
	$( '#inflections .progress-total' ).text( words.length );

	switch_screen( 'inflections' );

	var stats = {
		questions: _.map( words, function ( word ) {
			return {
				word: word,
				answer: undefined,
				user_answer: undefined,
				is_correct: undefined
			};
		} ),
		correct_count: 0
	};

	_.each( stats.questions, function ( question, i ) {
		promise = promise.then( function () {
			return inflections_do_one( form, stats, i );
		} );
	} );
	promise = promise
	.then( function () {
		var deferred = Q.defer();

		var $results = $( '#inflections-results' );
		$results.html( render_template( 'inflections-results', stats ) );
		switch_screen( 'inflections-results' );

		// the template should take care of showing the most relevant button first
		$results.find( 'button:visible' ).first().focus();

		return $results.find( '.quit' )
			.when( 'click', null, 'quit' )
			.orWhen( $results.find( '.redo-all' ),
				'click', null, 'redo-all' )
			.orWhen( $results.find( '.redo-incorrect' ),
				'click', null, 'redo-incorrect' )
			.then( function ( e ) {
				return e.data;
			} );
	} )
	.then( function ( button ) {
		if ( button === 'redo-all' ) {
			console.log( 'Redo all questions' );
			return inflections_exercise( form, words );
		} else if ( button === 'redo-incorrect' ) {
			console.log( 'Redo incorrectly answered questions' );
			var incorrect_words = _.chain( stats.questions )
				.map( function ( question ) {
					// return only incorrectly or unanswered questions
					return !question.is_correct && question.word;
				} )
				.compact()
				.shuffle()
				.value();
			return inflections_exercise( form, incorrect_words );
		} else if ( button === 'quit' ) {
			// do nothing, just don't continue
		}
	} );

	deferred.resolve( stats );

	return promise;
}

function inflections_do_one( form, stats, question_index ) {
	var wiki_base = 'https://en.wiktionary.org/w/';

	var q = stats.questions[question_index];

	var $parent = $( '#inflections' );
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
			var a = q.answer = inflection_get_from_html( form, html );
			$p( '.correct-answer' ).text( a.join( ', ' ) );
			console.log( 'Retrieved ' + (a.length===1 ? 'answer' : a.length+' answers') + ' from Wiktionary' );
			return a;
		} )

	// then show the result
	] ).spread( function ( user_answer, answer ) {
		q.is_correct = _.indexOf( q.answer, q.user_answer ) !== -1;
		$parent.addClass( q.is_correct ? 'answer-correct' : 'answer-incorrect' );
		if ( q.is_correct ) {
			stats.correct_count++;
		}

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

function inflection_get_from_html( form, html ) {
	var kase, number;
	if ( /^plural\-/.test(form) ) {
		kase = form.substr( 'plural-'.length );
		number = 'plural';
	} else if ( /^singular\-/.test(form) ) {
		kase = form.substr( 'singular-'.length );
		number = 'singular';
	}

	html = wiktionary_get_finnish_section( html );
	var $cell = $($.parseHTML( '<div>' + html + '</div>' )[0])

		// find the <tr> containing partitive
		.find( 'table.inflection-table tr' )
		.filter( function () {
			return $( this ).find( 'th' ).first().text() === kase;
		} )

		// get the right cell: left for singular, right for plural
		.find( number === 'singular' ? 'th + td' : 'th + td + td' );

	var variants = _.uniq( $cell.find( 'a' ).map( function () {
		return $( this ).text();
	} ).toArray() );

	return variants;
}