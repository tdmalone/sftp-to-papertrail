
'use strict';

const sftp = require( 'ssh2-sftp-client' ),
      decrypt = require( './kms-decrypt' ),
      utils = require( './utils' );

const log = utils.log;

/**
 * Gets the latest log file contents from an SFTP server.
 *
 * @param {Object} config A configuration object containing host, port, username, password and an
 *                        additional 'path' (to the log file to retrieve).
 * @returns {Promise} A Promise to provide the latest log file contents.
 */
module.exports = ( config ) => {
  return new Promise( ( resolve, reject ) => {

    const client = new sftp();
    log( 'Connecting to SFTP server...' );

    decrypt( config.password ).then( ( password ) => {
      config.password = password;
      return client.connect( config );
    }).then( () => {
      log( 'Retrieving latest log file...' );
      return client.get( config.path );
    }).then( ( stream ) => {

      const chunks = [];

      stream.on( 'data', ( chunk ) => {
        chunks.push( chunk );
        log( chunks.length + ' ' + utils.maybePlural( chunks.length, 'part', 'parts' ) + '...' );
      }).on( 'end', () => {

        const contents = chunks.join( '' ).trim(),
              lines = contents.split( '\n' ).length;

        // Disconnect from the SFTP server.
        client.end();

        log( 'Retrieved ' + lines + ' lines in approx ' + contents.length + ' bytes.' );
        resolve( contents );

      });

    }).catch( ( error ) => {

      // TODO: Handle the log file not existing. Probably need to throw.

      reject( error );

    });

  }); // Return Promise.
}; // Function getLogFileLatest.
