/**
 * A Node module that retrieves one or more log files via SFTP, and logs new entries to Papertrail.
 * Deploys to AWS Lambda and uses S3 for maintaining state.
 *
 * @author Tim Malone <tim.malone@chromatix.com.au>
 */

'use strict';

// @see https://github.com/jyu213/ssh2-sftp-client
// @see https://github.com/kenperkins/winston-papertrail
/*
const aws = require( 'aws-sdk' ),
      sftp = require( 'ssh2-sftp-client' ),
      papertrail = require( 'winston-papertrail' );
*/

// Get log file from Pantheon SFTP.
const getLogFile = () => {
  // TODO.
};

// Get log file from S3 bucket.
const getFromS3 = () => {
  // TODO.
};

// Save log file to S3 bucket.
const saveToS3 = () => {
  // TODO.
};

// Send the new lines to Papertrail via winston.
const sendToPapertrail = () => {
  // TODO.
};

exports.handler = ( event, context, callback ) => {

  getLogFile();
  getFromS3();
  saveToS3();
  sendToPapertrail();

  callback( null, 'Hello from Lambda' );

}; // Handler function.
