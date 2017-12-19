
'use strict';

const winston = require( 'winston' ),
      log = require( './utils' ).log,
      debug = require( './get-config' ).debug;

/**
 * Sends the new log lines to Papertrail, via Winston.
 *
 * @param {string} logLines   The log file lines to send to Papertrail.
 * @param {Object} config     A winston-papertrail configuration object containing host and port.
 * @returns {Promise} A Promise to log the new lines via Winston.
 */
module.exports = ( logLines, config ) => {
  return new Promise( ( resolve, reject ) => {

    log( 'Connecting to Papertrail...' );

    // @see https://github.com/kenperkins/winston-papertrail#usage
    // eslint-disable-next-line no-unused-expressions
    require( 'winston-papertrail' ).Papertrail;

    const papertrail = new winston.transports.Papertrail( config ),
          logger = new winston.Logger({ transports: [ papertrail ] });

    papertrail.on( 'error', ( error ) => {
      reject( error );
    }).on( 'connect', () => {

      const lines = logLines.split( '\n' );
      const logId = config.hostname + ' / ' + config.program;
      log( 'Logging ' + lines.length + ' lines (' + logId + ')...' );

      lines.forEach( ( line ) => {
        logger.info( line );
        if ( debug ) log( line );
      });

      logger.close();
      resolve();

    }); // On connect.
  }); // Return Promise.
}; // Function sendToPapertrail.
