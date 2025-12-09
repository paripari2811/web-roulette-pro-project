module.exports = function () {
	var module = {};

	module.login = function ( req, res, next ) {
		req.checkBody( 'email', 'Email address is required' ).notEmpty();
		req.checkBody( 'password', 'Password is required' ).notEmpty();
		req.checkBody( 'email', 'Please enter valid email-id' ).isEmail();
		var errors = req.validationErrors();
		if ( errors ) {
			req.flash( 'vErrors', errors );
			res.redirect( '/backend' );
		} else {
			next();
		}
	};
	
	module.user = function ( req, res, next ) {
		req.checkBody( 'name', 'Name is required' ).notEmpty();
		var errors = req.validationErrors();
		if ( errors ) {
			req.flash( 'vErrors', errors );
			if ( req.params.id ) {
				res.redirect( '/backend/user/edit/' + req.params.id );
			} else {
				res.redirect( '/backend/user/add' );
			}
		} else {
			next();
		}
	};
	
	module.cms = function ( req, res, next ) {
		req.checkBody( 'title', 'Package name is required' ).notEmpty();
		req.checkBody( 'description', 'Description is required' ).notEmpty();
		var errors = req.validationErrors();
		if ( errors ) {
			req.flash( 'vErrors', errors );
			if ( req.params.id ) {
				res.redirect( '/backend/cms/edit/' + req.params.id );
			} else {
				res.redirect( '/backend/cms/add' );
			}
		} else {
			next();
		}
	};
	
	module.changePassword = async function ( req, res, next ) {
		req.checkBody( 'oldpassword', 'Old password is required' ).notEmpty();
		req.checkBody( 'newpassword', 'New password is required' ).notEmpty();
		req.checkBody( 'confirmpassword', 'Confirm password is required' ).notEmpty();

		var errors = req.validationErrors();
		if ( errors ) {
			req.flash( 'vErrors', errors );
			res.redirect( '/backend/changepassword' );
		} else {
			next();
		}
	};
	
	return module;
};