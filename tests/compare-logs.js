
'use strict';

const compare = require( '../src/compare-logs' );

// @see https://github.com/abritinthebay/jest-tobetype
expect.extend( require( 'jest-tobetype' ) );

test( 'Comparison function returns a string', () => {
  expect( compare( 'a', 'b' ) ).toBeType( 'string' );
});

test( 'Comparison function correctly pulls out only new lines', () => {

  const oldLines = 'line1\nline2\nline3\n',
        newLinesOnly = 'line4\nline5\n',
        allLines = oldLines + newLinesOnly;

  expect( compare( oldLines, allLines ) ).toBe( newLinesOnly.trim() );

});
