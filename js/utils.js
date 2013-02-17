'use strict';

if ( typeof console === 'undefined' ) {
	var console = {
		log: function () {},
		error: function () {}
	}
}


function render_template( id, data, settings ) {
	var compiled = render_template.compiled = render_template.compiled || {};

	if ( !_.has( compiled, id ) ) {
		var $tpl = $( "#tpl-" + id ),
			variable = $tpl.data( 'variable' );
		if ( !$tpl.length ) {
			throw new Error( "No template element with ID #tpl-" + id + " found" );
		}
		compiled[id] = _.template( $tpl.text(), null, { variable: variable } );
	}

	return compiled[id]( data );
}
