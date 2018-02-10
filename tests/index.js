/**
 * Simple test suite for (the easily testable parts of) sftp-to-papertrail.
 *
 * TODO: Add additional tests with mocked SFTP, Winston and AWS modules.
 *
 * @author Tim Malone <tdmalone@gmail.com>
 */

/* global expect */

'use strict';

// @see https://github.com/abritinthebay/jest-tobetype
expect.extend( require( 'jest-tobetype' ) );

const theModule = require( '../' );

test( 'Module exports a handler function', () => {
  expect( theModule.handler ).toBeType( 'function' );
});

test( 'Comparison function returns a string', () => {
  expect( theModule.compareLogFiles( 'a', 'b' ) ).toBeType( 'string' );
});

test( 'Comparison function correctly pulls out only new lines', () => {

  const oldLines = 'line1\nline2\nline3\n',
        newLinesOnly = 'line4\nline5\n',
        allLines = oldLines + newLinesOnly;

  expect( theModule.compareLogFiles( oldLines, allLines ) ).toBe( newLinesOnly.trim() );

});
