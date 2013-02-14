function switch_screen( to_id ) {
	$( '.screen.active' ).removeClass( 'active' );
	$( '#' + to_id ).addClass( 'active' );
}
