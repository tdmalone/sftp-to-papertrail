
'use strict';

const log = require( './utils' ).log;

/**
 * Compares the contents of two log files, returning the differing lines.
 *
 * @param {string} oldContents The contents of the old (last known state of the) log file.
 * @param {string} newContents The contents of the new (latest) log file.
 * @returns {string} The lines that differ, for example, any new lines present in the new log file
 *                   that didn't exist in the old. If an old log file is not available, a blank
 *                   string will be returned to avoid returning everything when logging a new file.
 */
module.exports = ( oldContents, newContents ) => {

  if ( ! oldContents ) {
    log( 'As we have no old log file to compare with, no log lines will be selected.' );
    return '';
  }

  log( 'Looking for new log entries...' );

  // Split the log file lines into arrays, filtering out any blank lines.
  const oldLines = oldContents.split( '\n' ).filter( () => true ),
        newLines = newContents.split( '\n' ).filter( () => true );

  // An implementation of array diff.
  // @see https://stackoverflow.com/a/33034768/1982136
  // eslint-disable-next-line no-magic-numbers
  const difference = newLines.filter( line => 0 > oldLines.indexOf( line ) );

  log( 'Found ' + difference.length + ' new lines.' );

  // Return the new lines as a string, with any outside whitespace removed.
  return difference.join( '\n' ).trim();

}; // Module.exports.
