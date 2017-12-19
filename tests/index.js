/**
 * Simple test suite for (the easily testable parts of) sftp-to-papertrail.
 *
 * TODO: Add additional tests with mocked SFTP, Winston and AWS modules.
 *
 * @author Tim Malone <tdmalone@gmail.com>
 */

'use strict';

const index = require( '../' );

// @see https://github.com/abritinthebay/jest-tobetype
expect.extend( require( 'jest-tobetype' ) );

test( 'Module exports a handler function', () => {
  expect( index.handler ).toBeType( 'function' );
});
