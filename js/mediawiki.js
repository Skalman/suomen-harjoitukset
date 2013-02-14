/**
 * Defines function for accessing pages from a wiki
 */

'use strict';

function mediawiki_get_page_html( wiki_base, page ) {
	return Q.fcall( $.ajax, {
		url: wiki_base + 'api.php?format=json' +
			'&action=parse' +
			'&page=' + encodeURIComponent( page ),

		// avoid additional parameter _=TIMESTAMP and caching doesn't matter
		cache: true,

		dataType: 'jsonp'
	} ).then( function ( data ) {
		if ( data.error ) {
			throw data.error;
			// deferred.reject( data.error );
		} else {
			return data.parse.text['*'];
			// deferred.resolve( data.parse.text['*'] );
		}
	} );
}

function mediawiki_get_category( wiki_base, category, limit ) {
	if ( limit === undefined ) {
		limit = 1000;
	}

	// console.log( 'mediawiki_get_category' );

	var deferred = Q.defer();
	var res = [];

	function retrieve( continue_token ) {
		// $.getJSON('https://en.wiktionary.org/w/api.php?format=json&action=query&list=categorymembers&cmtitle=Category%3AFinnish%20nominals%20with%20declension&cmlimit=10',function (data) {
		// 	console.log( 'GOT ', data );
		// });
		// return;

		continue_token = continue_token ? '&cmcontinue=' + encodeURIComponent( continue_token ) : ''

		$.ajax( {
			url: wiki_base + 'api.php?format=json' +
				'&action=query' +
				'&list=categorymembers' +
				'&cmtitle=' + encodeURIComponent( 'Category:' + category ) +
				'&cmlimit=' + Math.min( 5, limit - res.length ) +
				continue_token,

			// avoid additional parameter _=TIMESTAMP and caching doesn't matter
			cache: true,

			dataType: 'jsonp',
			success: function ( data ) {
				res.push.apply( res, data.query.categorymembers );
				
				if ( res.length !== limit && data['query-continue'] ) {
					retrieve( data['query-continue'].categorymembers.cmcontinue );
				} else {
					deferred.resolve( res );
				}
			},
			error: function ( jqXHR, textStatus, errorThrown ) {
				deferred.reject( textStatus );
			},
		} );
	}

	retrieve();

	return deferred.promise;
}
