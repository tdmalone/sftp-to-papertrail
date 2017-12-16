/**
 * A Node module that retrieves one or more log files via SFTP, and logs new entries to Papertrail.
 * Deploys to AWS Lambda and uses S3 for maintaining state.
 *
 * @author Tim Malone <tdmalone@gmail.com>
 */

'use strict';

const DEFAULT_SFTP_PORT = 22,
      DEBUG = false;

// @see https://github.com/aws/aws-sdk-js
// @see https://github.com/jyu213/ssh2-sftp-client
// @see https://github.com/kenperkins/winston-papertrail

const aws = require( 'aws-sdk' ),
      path = require( 'path' ),
      sftp = require( 'ssh2-sftp-client' ),
      winston = require( 'winston' );

// @see https://github.com/kenperkins/winston-papertrail#usage
// eslint-disable-next-line no-unused-expressions
require( 'winston-papertrail' ).Papertrail;

const kms = new aws.KMS();

// Whether or not the function is being executed within an AWS Lambda environment.
// @see http://docs.aws.amazon.com/lambda/latest/dg/current-supported-versions.html
const isLambda = process.env.AWS_EXECUTION_ENV ? true : false; // eslint-disable-line no-process-env

exports.handler = ( event, context, callback ) => {

  /* eslint-disable no-process-env, require-jsdoc */
  const getEnv = ( envName, defaultValue ) => {
    if ( process.env[ envName ]) return process.env[ envName ];
    if ( defaultValue ) return defaultValue;
    throw new Error( 'Please set ' + envName + '.' );
  };
  /* eslint-enable no-process-env, require-jsdoc */

  // Retrieves configuration from the environment. Sensitive data should be encrypted with AWS KMS.
  const config = {

    sftp: {

      host:       getEnv( 'STP_SFTP_HOST' ),
      port:       getEnv( 'STP_SFTP_PORT', DEFAULT_SFTP_PORT ),
      username:   getEnv( 'STP_SFTP_USERNAME' ),
      password:   getEnv( 'STP_SFTP_PASSWORD' ),
      path:       getEnv( 'STP_SFTP_PATH' ),
      debug:      DEBUG ? console.log : null,

      // Explicitly provide diffie-hellman algorithms to resolve handshake issues.
      algorithms: {
        kex: [
          'diffie-hellman-group1-sha1',
          'diffie-hellman-group-exchange-sha1',
          'diffie-hellman-group14-sha1',
          'diffie-hellman-group-exchange-sha256',
        ]
      }
    },

    // For S3 access, credentials are taken directly from the environment, eg. AWS_ACCESS_KEY_ID and
    // AWS_ACCESS_KEY or ~/.aws/credentials.
    s3: {
      bucket: getEnv( 'STP_S3_BUCKET' ),
      region: getEnv( 'STP_S3_REGION' ),
      path:   getEnv( 'STP_SFTP_PATH' )
    },

    // @see https://github.com/kenperkins/winston-papertrail#usage
    papertrail: {
      host:     getEnv( 'STP_PAPERTRAIL_HOST' ),
      port:     getEnv( 'STP_PAPERTRAIL_PORT' ),
      hostname: getEnv( 'STP_SFTP_HOST' ),
      program:  path.parse( getEnv( 'STP_SFTP_PATH' ) ).name,
      colorize: true
    }

  }; // Const config.

  // Get the two copies of the log files.
  const getOld = getLogFileStore( config.s3 ),
        getNew = getLogFileLatest( config.sftp );

  // A Promise to retrieve both of the files.
  Promise.all([ getOld, getNew ]).then( ( data ) => {

    // Work out which lines in the log file are new since we last checked.
    const logFileOld = 0,
          logFileNew = 1,
          newLogLines = compareLogFiles( data[ logFileOld ], data[ logFileNew ]);

    // Save the new log file to our store, and send the new log lines to Papertrail.
    const store = saveToStore( logFileNew, config.s3 ),
          send = sendToPapertrail( newLogLines, config.papertrail );

    // A Promise to complete storing and sending.
    return Promise.all([ store, send ]);

  }).then( ( result ) => {
    console.log( 'Done.' );
    callback( null, result );
  }).catch( ( error ) => {
    callback( error );
  });

}; // Exports.handler.

exports.compareLogFiles = compareLogFiles;

/**
 * Gets the latest log file contents from an SFTP server.
 *
 * @param {Object} config A configuration object containing host, port, username, password and an
 *                        additional 'path' (to the log file to retrieve).
 * @returns {Promise} A Promise to provide the latest log file contents.
 */
function getLogFileLatest( config ) {
  return new Promise( ( resolve, reject ) => {

    const client = new sftp();

    console.log( 'Connecting to SFTP server...' );

    // TODO: How do we disconnect when we're done?

    decrypt( config.password ).then( ( password ) => {
      config.password = password;
      return client.connect( config );
    }).then( () => {
      console.log( 'Retrieving latest log file...' );
      return client.get( config.path );
    }).then( ( stream ) => {

      const chunks = [];

      stream.on( 'data', ( chunk ) => {
        chunks.push( chunk );
        console.log( chunks.length + ' part' + ( 1 < chunks.length ? 's' : '' ) + '...' );
      }).on( 'end', () => {

        const contents = chunks.join( '' ),
              lines = contents.split( '\n' ).length;

        console.log( 'Retrieved ' + lines + ' lines in approx ' + contents.length + ' bytes.' );
        resolve( contents );

      });

    }).catch( ( error ) => {
      reject( error );
    });

  }); // Return Promise.
} // Function getLogFileLatest.

/**
 * Gets last known log file from an S3 bucket.
 *
 * @param {Object} config A custom S3 configuration object containing bucket, region and path.
 * @returns {Promise} A Promise to provide the contents of the old log file.
 */
function getLogFileStore( config ) {
  return new Promise( ( resolve, reject ) => {

    // TODO: Write this function.
    console.log( 'Retrieving old log file for comparison (TODO)...' );
    resolve( 'line1\nline2' );

  }); // Return Promise.
} // Function getLogFileStore.

/**
 * Compares the contents of two log files, returning the differing lines.
 *
 * @param {string} oldContents The contents of the old (last known state of the) log file.
 * @param {string} newContents The contents of the new (latest) log file.
 * @returns {string} The lines that differ, for example, any new lines present in the new log file
 *                   that didn't exist in the old.
 */
function compareLogFiles( oldContents, newContents ) {

  console.log( 'Looking for new log entries...' );

  // Split the log file lines into arrays, filtering out any blank lines.
  const oldLines = oldContents.split( '\n' ).filter( () => true ),
        newLines = newContents.split( '\n' ).filter( () => true );

  // An implementation of array diff.
  // @see https://stackoverflow.com/a/33034768/1982136
  // eslint-disable-next-line no-magic-numbers
  const difference = newLines.filter( line => 0 > oldLines.indexOf( line ) );

  console.log( 'Found ' + difference.length + ' new lines.' );

  // Return the new lines as a string, with any outside whitespace removed.
  return difference.join( '\n' ).trim();

} // Function compareLogFiles.

/**
 * Saves new log file to an S3 bucket.
 *
 * @param {string} contents The contents of the log file to save.
 * @param {Object} config   A custom S3 configuration object containing bucket, region and path.
 * @returns {Promise} A Promise to save the file to an S3 bucket.
 */
function saveToStore( contents, config ) {
  return new Promise( ( resolve, reject ) => {

    // TODO: Write this function.
    console.log( 'Store log file for later comparison (TODO)...' );
    resolve();

  }); // Return Promise.
} // Function saveToStore.

/**
 * Sends the new log lines to Papertrail, via Winston.
 *
 * @param {string} logLines   The log file lines to send to Papertrail.
 * @param {Object} config     A winston-papertrail configuration object containing host and port.
 * @returns {Promise} A Promise to log the new lines via Winston.
 */
function sendToPapertrail( logLines, config ) {
  return new Promise( ( resolve, reject ) => {

    console.log( 'Connecting to Papertrail...' );

    const papertrail = new winston.transports.Papertrail( config ),
          logger = new winston.Logger({ transports: [ papertrail ] });

    papertrail.on( 'error', ( error ) => {
      reject( error );
    }).on( 'connect', () => {

      const splitLines = logLines.split( '\n' );
      console.log( 'Logging ' + splitLines.length + ' lines...' );

      splitLines.forEach( ( line ) => {
        //logger.info( line );
        //console.log( line );
      });

      logger.close();
      resolve();

    });

  }); // Return Promise.
} // Function sendToPapertrail.

/**
 * Decrypts an encrypted string with AWS KMS.
 *
 * Returns the string as-is if the execution environment is not AWS Lambda, for example if you are
 * running this function locally, you'll probably have your env vars available in plain text.
 *
 * @param {string} encrypted The encrypted string.
 * @returns {Promise} A Promise to provide the decrypted string.
 */
function decrypt( encrypted ) {
  return new Promise( ( resolve, reject ) => {

    if ( ! isLambda ) {
      resolve( encrypted );
      return;
    }

    console.log( 'Decrypting SFTP password...' );

    kms.decrypt({ CiphertextBlob: Buffer.from( encrypted, 'base64' ) }, ( error, data ) => {
      if ( error ) reject( error );
      resolve( data.Plaintext.toString( 'ascii' ) );
    });

  }); // Return Promise.
} // Function decrypt.
