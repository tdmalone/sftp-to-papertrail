
'use strict';

/* eslint-disable no-magic-numbers */

const utils = require( '../src/utils' );

test( 'Pluraliser returns plural form for 0', () => {
  expect( utils.maybePlural( 0, 'single', 'plural' ) ).toBe( 'plural' );
});

test( 'Pluraliser returns singular form for 1', () => {
  expect( utils.maybePlural( 1, 'single', 'plural' ) ).toBe( 'single' );
});

test( 'Pluraliser returns plural form for 2', () => {
  expect( utils.maybePlural( 2, 'single', 'plural' ) ).toBe( 'plural' );
});

test( 'Logger outputs when silent not set', () => {

  jest.resetModules();
  delete process.env.STP_SILENT; // eslint-disable-line no-process-env
  const utils = require( '../src/utils' );

  // Mock console.log, used by utils.log, to catch the output.
  let output = '';
  console.log = jest.fn( ( inputs ) => {
    output += inputs;
  });

  utils.log( 'Test output' );
  expect( output ).toBe( 'Test output' );

});

test( 'Logger does not output when silent is true', () => {

  jest.resetModules();
  process.env.STP_SILENT = 'true'; // eslint-disable-line no-process-env
  const utils = require( '../src/utils' );

  // Mock console.log, used by utils.log, to catch the output.
  let output = '';
  console.log = jest.fn( ( inputs ) => {
    output += inputs;
  });

  utils.log( 'Test output' );
  expect( output ).toBe( '' );

});
