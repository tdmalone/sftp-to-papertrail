
'use strict';

const connectS3 = require( './connect-s3' ).log,
      log = require( './utils' ).log,
      { StringDecoder } = require( 'string_decoder' );

/**
 * Gets last known log file from an S3 bucket.
 *
 * @param {Object} config A custom S3 configuration object containing bucket, region and path.
 * @returns {Promise} A Promise to provide the contents of the old log file.
 */
module.exports = ( config ) => {
  return new Promise( ( resolve ) => {

    const s3 = connectS3( config.region );
    log( 'Retrieving old log file for comparison...' );

    // @see http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getObject-property
    const params = {
      Bucket: config.bucket,
      Key:    config.path
    };

    s3.getObject( params, ( error, data ) => {

      if ( error ) {

        // TODO: Work out the difference between various S3 errors and if it's a connection failure
        // rather than just the file not existing yet, bow out rather than continuing.

        console.warn(
          '\n' +
          'Error accessing S3: ' + error + '\n\n' +
          'Cannot access old log file. We\'ll still store the new log file, but won\'t' + '\n' +
          'send old events. This is totally normal if you\'re running this for the first' + '\n' +
          'time or have just changed your log file path. Otherwise, something may be' + '\n' +
          'wrong with your S3 log store and you may be missing events.' + '\n'
        );

        resolve();
        return;

      }

      const decoder = new StringDecoder( 'utf8' );
      resolve( decoder.write( data.Body ) );

    }); // S3.getObject.
  }); // Return Promise.
}; // Function getLogFileStore.
