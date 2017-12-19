
'use strict';

const path = require( 'path' ),
      log = require( './utils' ).log;

const DEFAULT_SFTP_PORT = 22,
      DEFAULT_AWS_REGION = 'us-east-1';

let config;

/**
 * Retrieves configuration from the environment. Sensitive data should be encrypted with AWS KMS.
 *
 * @returns {Object} A configuration object containing sftp, s3 and papertrail objects.
 */
module.exports = () => {

  if ( config ) return config;

  config = {};

  config.debug = getEnv( 'STP_DEBUG', false ); // Verbosely outputs SFTP commands + log file lines.
  config.silent = getEnv( 'STP_SILENT', false ); // Silences console output (except for errors).

  // Whether or not the function is being executed within an AWS Lambda environment.
  // @see http://docs.aws.amazon.com/lambda/latest/dg/current-supported-versions.html
  config.isLambda = getEnv( 'AWS_EXECUTION_ENV', '' ) ? true : false;

  config.sftp = {

    host:     getEnv( 'STP_SFTP_HOST' ),
    port:     getEnv( 'STP_SFTP_PORT', DEFAULT_SFTP_PORT ),
    username: getEnv( 'STP_SFTP_USERNAME' ),
    password: getEnv( 'STP_SFTP_PASSWORD' ),
    path:     getEnv( 'STP_SFTP_PATH' ),
    debug:    config.debug ? log : null,

    // Explicitly provide diffie-hellman algorithms to resolve handshake issues.
    algorithms: {
      kex: [
        'diffie-hellman-group1-sha1',
        'diffie-hellman-group-exchange-sha1',
        'diffie-hellman-group14-sha1',
        'diffie-hellman-group-exchange-sha256'
      ]
    }
  };

  config.s3 = {
    bucket: getEnv( 'STP_S3_BUCKET' ),
    region: getEnv( 'STP_S3_REGION', DEFAULT_AWS_REGION ),
    path:   getEnv( 'STP_SFTP_HOST' ) + '/' + getEnv( 'STP_SFTP_PATH' )
  };

  // @see https://github.com/kenperkins/winston-papertrail#usage
  config.papertrail = {
    host:     getEnv( 'STP_PAPERTRAIL_HOST' ),
    port:     getEnv( 'STP_PAPERTRAIL_PORT' ),
    hostname: getEnv( 'STP_SFTP_HOST' ),
    program:  path.parse( getEnv( 'STP_SFTP_PATH' ) ).name,
    colorize: true
  };

  return config;

}; // Module.exports.

/**
 * Gets an environment variable, throwing an error if it doesn't exist (unless a default value is
 * provided).
 *
 * @param {string} envName      The name of the environment variable to retrieve.
 * @param {string} defaultValue An optional default value to use if the variable isn't set, which
 *                              essentially renders the variable optional.
 * @throws Throws an error if a required variable is not set.
 * @returns {string} The value of the requested environment variable.
 */
function getEnv( envName, defaultValue ) {
  if ( process.env[ envName ]) return process.env[ envName ]; // eslint-disable-line no-process-env
  if ( 'undefined' !== typeof defaultValue ) return defaultValue;
  throw new Error( 'Please set ' + envName + '.' );
}
