'use strict';

$( function () {
	var forms = populate_inflection_forms();

	// The overall view
	// ----------------
	$( '#init button' ).on( 'click', function () {
		var $this = $(this);
		var form = $this.data( 'form' );
		console.log( 'Start', form.id );

		switch_screen( 'exercises' );

		get_words()
		.then(function ( words ) {
			return words_to_exercise_list( words, form );
		}).then( create_app )
		.then( function ( stats ) {
			console.log( 'Exercise done' );
		}).fail( function ( err ) {
			console.error( 'Caught error:', err );
		}).then( function() {
			switch_screen( 'init' );
			$this.focus();
		});
	});

	// Message customization
	// ---------------------
	App_view.i18n.messages( 'fi',
		'correct_answer_text',
		'{{PLURAL:$1|Oikea vastaus|Oikeat vastaukset}} Wikisanakirjan mukaan:' );

	// Get words
	// ---------
	// Retrieve a list of words
	function get_words() {
		return Q.fcall( $.ajax, {
			url: 'resources/words.json',
			dataType: 'json'
		}).then( function ( data ) {
			var words = _.map( data.words, _.identity );
			words = words.concat.apply( [], words );
			words = _.shuffle( words );

			return words;
		});
	}

	// Convert a words to exercises
	// ----------------------------
	// Takes a list of words and a form, and returns an Exercise list
	function words_to_exercise_list( words, form ) {
		function retrieve_answer( exercise ) {
			// and when we got the HTML from Wiktionary
			var wiki_base = 'https://en.wiktionary.org/w/';

			return mediawiki_get_page_html( wiki_base, exercise.get('question') )
			.then( function got_html( html ) {
				var a = get_form( form.id, html );
				console.log( 'Retrieved ' + (a.length===1 ? 'answer' : a.length+' answers') + ' from Wiktionary' );
				return a;
			});
		}
		return new Exercise_list({
			instructions: 'Kirjoita sanan ' + form.text,
			exercises: _.map( words, function ( word ) {
				return {
					question: word,
					answer: retrieve_answer
				};
			})
		});
	}

	// Create the app
	// --------------
	function create_app( exercise_list ) {
		var deferred = Q.defer();

		var app = new App_view({
			exercises: exercise_list,
			lang: 'fi',
			elem: $('#exercises')
		}).on( 'complete', deferred.resolve );

		return deferred.promise;
	}

	// Get the given form from HTML
	// ----------------------------
	// The given HTML should be an English Wiktionary page containing a Finnish section. The form in question, will then be extracted from the inflection table.
	function get_form( form, html ) {
		var kase, number;
		if ( /^plural\-/.test(form) ) {
			kase = form.substr( 'plural-'.length );
			number = 'plural';
		} else if ( /^singular\-/.test(form) ) {
			kase = form.substr( 'singular-'.length );
			number = 'singular';
		}

		html = get_finnish_section( html );
		var $cell = $($.parseHTML( '<div>' + html + '</div>' )[0])

			// find the <tr> containing partitive
			.find( 'table.inflection-table tr' )
			.filter( function () {
				return $( this ).find( 'th' ).first().text() === kase;
			})

			// get the right cell: left for singular, right for plural
			.find( number === 'singular' ? 'th + td' : 'th + td + td' );

		var variants = _.uniq( $cell.find( 'a' ).map( function () {
			return $( this ).text();
		}).toArray() );

		return variants;
	}

	// Retrieve the Finnish section
	// ----------------------------
	function get_finnish_section( html ) {
		var start, end;
		start = /<span class="mw-headline"[^>]+>Finnish<\/span>[^\n]*?<\/h2>/.exec( html );
		if ( start ) {
			html = html.substr( start.index + start[0].length );
			end = /<h2/.exec( html );
			if ( end ) {
				html = html.substr( 0, end.index );
			}
			return html;
		} else {
			console.error( 'Could not extract the Finnish section from HTML' );
			return null;
		}
	}

	// Access a page from a wiki
	// -------------------------
	function mediawiki_get_page_html( wiki_base, page ) {
		return Q.fcall( $.ajax, {
			url: wiki_base + 'api.php?format=json' +
				'&action=parse' +
				'&page=' + encodeURIComponent( page ),

			// avoid additional parameter _=TIMESTAMP and caching doesn't matter
			cache: true,

			dataType: 'jsonp'
		}).then( function ( data ) {
			if ( data.error ) {
				throw data.error;
			} else {
				return data.parse.text['*'];
			}
		});
	}

	// Add form information to each start button
	// -----------------------------------------
	function populate_inflection_forms() {
		var forms = {};
		var number_id = ['singular', 'plural'];
		var number_text = ['yksikön', 'monikon'];
		$( '#init tbody tr' ).each(function () {
			var $tr = $( this );
			var case_id = $tr.data( 'case' );
			var case_text = $tr.find( 'th' ).text().toLowerCase();
			$tr.find( 'button' ).each(function (index) {
				var explanation = $( this ).find( 'small' ).text().toLowerCase();
				var data = {
					id: number_id[index] + '-' + case_id,
					text: number_text[index] + ' ' + case_text + ' (' + explanation + ')',
				};
				$( this ).data( 'form', data );
			});
		});
	}


	// Switch between #init and #exercises
	// -----------------------------------
	function switch_screen( to_id ) {
		$( '.screen.active' ).removeClass( 'active' );
		$( '#' + to_id ).addClass( 'active' );
	}

	// Other
	// -----

	// If the console is not defined, just define a NOOP
	var console = window.console || { log: function () {}, error: function () {} };

});
