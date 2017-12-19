/**
 * A Node module that retrieves log files via SFTP, and logs new entries to Papertrail. Deploys to
 * AWS Lambda and uses S3 for maintaining state.
 *
 * TODO: Add ability to manage retrieval of multiple log files at the same time.
 *
 * @name _SFTP-to-Papertrail
 * @author Tim Malone <tdmalone@gmail.com>
 */

'use strict';

const config = require( './src/get-config' )(),
      log = require( './src/utils' ).log,
      compare = require( './src/compare-logs' ),
      getFromS3 = require( './src/get-s3' ),
      getFromSFTP = require( './src/get-sftp' ),
      saveToS3 = require( './src/save-s3' ),
      sendToPapertrail = require( './src/send-to-papertrail' );

// @see https://github.com/aws/aws-sdk-js
// @see https://github.com/jyu213/ssh2-sftp-client
// @see https://github.com/kenperkins/winston-papertrail

module.exports.handler = ( event, context, callback ) => {

  const getResult = [],
        sendResult = [];

  // Get the two copies of the log files.
  getResult.push( getFromS3( config.s3 ) );
  getResult.push( getFromSFTP( config.sftp ) );

  Promise.all( getResult ).then( ( data ) => {

    // Work out which lines in the log file are new since we last checked.
    const OLD = 0,
          NEW = 1,
          newLogLines = compare( data[ OLD ], data[ NEW ]);

    // If there's new log lines, or we didn't have an old log file, store the new log file.
    if ( newLogLines || ! data[ OLD ]) {
      sendResult.push( saveToS3( data[ NEW ], config.s3 ) );
    }

    // If there's new log lines, send them to Papertrail.
    if ( newLogLines ) {
      sendResult.push( sendToPapertrail( newLogLines, config.papertrail ) );
    }

    return Promise.all( sendResult );

  }).then( ( result ) => {
    log( 'Done.' );
    callback( null, result );
  }).catch( ( error ) => {
    callback( error );
  });

}; // Module.exports.handler.
