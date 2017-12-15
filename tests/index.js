
'use strict';

const theModule = require( '../' );

test( 'Module exports a handler function', () => {
  expect( typeof theModule.handler ).toBe( 'function' );
});
