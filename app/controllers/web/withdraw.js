module.exports = function ( config ) {
	var module = {};
	module.view = async function ( req, res ) {
		try {
			if ( req.session.user.id ) {
				req.flash( 'error', "The session has been expired, please login again." );
				res.redirect( '/login' );
			}
		} catch ( error ) {
			res.redirect( '/' );
		}
	};
	return module;
};