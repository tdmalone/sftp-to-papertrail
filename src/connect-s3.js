
'use strict';

const aws = require( 'aws-sdk' ),
      log = require( './utils' ).log;

let s3;

/**
 * Connects to AWS S3, storing the reference in the upper scope for other functions to access.
 * Credentials are managed automatically by the AWS SDK, usually using ~/.aws/credentials or a
 * Lambda role.
 *
 * @param {string} region The AWS region to connect to.
 * @returns {Object} An instance of an S3 object, from the AWS SDK.
 * @see https://github.com/aws/aws-sdk-js
 */
module.exports = ( region ) => {
  if ( s3 ) return s3;
  log( 'Connecting to S3...' );
  return new aws.S3({ region: region });
};
