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
		} else {
			return data.parse.text['*'];
		}
	} );
}
