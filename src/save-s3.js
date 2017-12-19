
'use strict';

const connectS3 = require( './connect-s3' ).log,
      log = require( './utils' ).log;

/**
 * Saves new log file to an S3 bucket.
 *
 * @param {string} contents The contents of the log file to save.
 * @param {Object} config   A custom S3 configuration object containing bucket, region and path.
 * @returns {Promise} A Promise to save the file to an S3 bucket.
 */
module.exports = ( contents, config ) => {
  return new Promise( ( resolve, reject ) => {

    const s3 = connectS3( config.region );
    log( 'Storing log file for later comparison...' );

    // @see http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property
    const params = {
      Body:        contents,
      Bucket:      config.bucket,
      Key:         config.path,
      ContentType: 'text/plain'
    };

    s3.putObject( params, ( error ) => {
      if ( error ) reject( error );
      else resolve();
    });

  }); // Return Promise.
}; // Function saveToStore.
