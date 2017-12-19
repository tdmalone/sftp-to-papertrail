
'use strict';

module.exports = {

  /**
   * Maybe pluralises a string depending on the given number.
   *
   * @param {integer} number  The number you wish to refer to.
   * @param {string} singular The singular term for referring to 1 of number.
   * @param {string} plural   The plural term for referring to 0 or > 1 of number.
   * @returns {string} Either the singular or plural string.
   */
  maybePlural: ( number, singular, plural ) => {
    return 1 === number ? singular : plural; // eslint-disable-line no-magic-numbers
  },

  /**
   * A console log wrapping function that only logs if SILENT is not true.
   *
   * @returns {undefined}
   */
  log: ( ...args ) => {
    const config = require( './get-config' )();
    if ( config.silent ) return;
    console.log.apply( null, args );
  }

}; // Module.exports.
