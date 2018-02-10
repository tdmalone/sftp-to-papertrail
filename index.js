/**
 * A Lambda function that retrieves log files via SFTP, and logs new entries to Papertrail. Uses S3
 * for maintaining state.
 *
 * @author Tim Malone <tdmalone@gmail.com>
 */

'use strict';

const DEBUG = false, // When true, SFTP commands and log file lines will be verbosely output.
      SILENT = false, // When true, there will be no console output except for errors.
      DEFAULT_SFTP_PORT = 22;

/* eslint-disable no-process-env */
const AWS_DEFAULT_REGION = process.env.AWS_DEFAULT_REGION || 'us-east-1';
/* eslint-enable no-process-env */

// @see https://github.com/aws/aws-sdk-js
// @see https://github.com/jyu213/ssh2-sftp-client
// @see https://github.com/kenperkins/winston-papertrail

const aws = require( 'aws-sdk' ),
      path = require( 'path' ),
      sftp = require( 'ssh2-sftp-client' ),
      winston = require( 'winston' ),
      { StringDecoder } = require( 'string_decoder' );

let s3;

exports.handler = ( event, context, callback ) => {

  const filePaths = getEnv( 'STP_SFTP_PATH' ),
        fileSyncs = [];

  filePaths.split( ',' ).forEach( ( filePath ) => {
    const config = getConfig( filePath );
    fileSyncs.push( syncFile( config ) );
  });

  Promise.all( fileSyncs ).then( ( result ) => {
    log( 'Done.' );
    callback( null, result );
  }).catch( ( error ) => {
    callback( error );
  });

}; // Exports.handler.

exports.compareLogFiles = compareLogFiles;

/**
 *
 */
function syncFile( config ) {

  const getResult = [],
        sendResult = [];

  // Get the two copies of the log files.
  getResult.push( getLogFileStore( config ) );
  getResult.push( getLogFileLatest( config ) );

  return Promise.all( getResult ).then( ( data ) => {

    // Work out which lines in the log file are new since we last checked.
    const OLD = 0,
          NEW = 1,
          newLogLines = compareLogFiles( data[ OLD ], data[ NEW ], config );

    // If there's new log lines, or we didn't have an old log file, store the new log file.
    if ( newLogLines || ! data[ OLD ]) {
      sendResult.push( saveToStore( data[ NEW ], config ) );
    }

    // If there's new log lines, send them to Papertrail.
    if ( newLogLines ) {
      sendResult.push( sendToPapertrail( newLogLines, config ) );
    }

    if ( ! sendResult.length ) {
      log( config.sftp.path, 'Nothing to do.' );
      sendResult.push( ( new Promise( ( resolve ) => {
        resolve( 'Nothing to do.' );
      }) ) );
    }

    return Promise.all( sendResult );

  }); // Return Promise.all.
} // Function syncFile.

/**
 * Retrieves configuration from the environment.
 *
 * @returns {Object} A configuration object containing sftp, s3 and papertrail objects.
 */
function getConfig( filePath ) {
  return {

    sftp: {

      host:     getEnv( 'STP_SFTP_HOST' ),
      port:     getEnv( 'STP_SFTP_PORT', DEFAULT_SFTP_PORT ),
      username: getEnv( 'STP_SFTP_USERNAME' ),
      password: getEnv( 'STP_SFTP_PASSWORD' ),
      path:     filePath,
      debug:    DEBUG ? log : null,

      // Explicitly provide diffie-hellman algorithms to resolve handshake issues.
      algorithms: {
        kex: [
          'diffie-hellman-group1-sha1',
          'diffie-hellman-group-exchange-sha1',
          'diffie-hellman-group14-sha1',
          'diffie-hellman-group-exchange-sha256'
        ]
      }
    },

    s3: {
      bucket: getEnv( 'STP_S3_BUCKET' ),
      region: getEnv( 'STP_S3_REGION', AWS_DEFAULT_REGION ),
      path:   getEnv( 'STP_SFTP_HOST' ) + '/' + filePath
    },

    // @see https://github.com/kenperkins/winston-papertrail#usage
    papertrail: {
      host:     getEnv( 'STP_PAPERTRAIL_HOST' ),
      port:     getEnv( 'STP_PAPERTRAIL_PORT' ),
      hostname: getEnv( 'STP_SFTP_HOST' ),
      program:  path.parse( filePath ).name,
      colorize: true
    }

  }; // Return object.
} // Function getConfig;

/**
 * Connects to AWS S3, storing the reference in the upper scope for other functions to access.
 * Credentials are managed automatically by the AWS SDK, usually using ~/.aws/credentials or a
 * Lambda role.
 *
 * @param {string} region The AWS region to connect to.
 * @returns {undefined}
 */
function connectToS3( region ) {
  log( 'Connecting to S3...' );
  s3 = new aws.S3({ region: region });
}

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
    log( config.sftp.path, 'Connecting to SFTP server...' );

    client.connect( config.sftp ).then( () => {
      log( config.sftp.path, 'Retrieving latest log file...' );
      return client.get( config.sftp.path );
    }).then( ( stream ) => {

      const chunks = [];

      stream.on( 'data', ( chunk ) => {
        const logMsg = chunks.length + ' ' + maybePlural( chunks.length, 'part', 'parts' ) + '...';
        chunks.push( chunk );
        log( config.sftp.path, logMsg );
      }).on( 'end', () => {

        const contents = chunks.join( '' ).trim(),
              lines = contents.split( '\n' ).length,
              logMsg = 'Retrieved ' + lines + ' lines in approx ' + contents.length + ' bytes.';

        // Disconnect from the SFTP server.
        client.end();

        log( config.sftp.path, logMsg );
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
  return new Promise( ( resolve ) => {

    if ( ! s3 ) connectToS3( config.s3.region );
    log( config.sftp.path, 'Retrieving old log file for comparison...' );

    // @see http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getObject-property
    s3.getObject({
      Bucket: config.s3.bucket,
      Key:    config.s3.path
    }, ( error, data ) => {

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
} // Function getLogFileStore.

/**
 * Compares the contents of two log files, returning the differing lines.
 *
 * @param {string} oldContents The contents of the old (last known state of the) log file.
 * @param {string} newContents The contents of the new (latest) log file.
 * @returns {string} The lines that differ, for example, any new lines present in the new log file
 *                   that didn't exist in the old. If an old log file is not available, a blank
 *                   string will be returned to avoid returning everything when logging a new file.
 */
function compareLogFiles( oldContents, newContents, config = { sftp: { path: '' } }) {

  if ( ! oldContents ) {
    const logMsg = 'As we have no old log file to compare with, no log lines will be selected.';
    log( config.sftp.path, logMsg );
    return '';
  }

  log( config.sftp.path, 'Looking for new log entries...' );

  // Split the log file lines into arrays, filtering out any blank lines.
  const oldLines = oldContents.split( '\n' ).filter( () => true ),
        newLines = newContents.split( '\n' ).filter( () => true );

  // An implementation of array diff.
  // @see https://stackoverflow.com/a/33034768/1982136
  // eslint-disable-next-line no-magic-numbers
  const difference = newLines.filter( line => 0 > oldLines.indexOf( line ) );

  log( config.sftp.path, 'Found ' + difference.length + ' new lines.' );

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

    if ( ! s3 ) connectToS3( config.s3.region );
    log( config.sftp.path, 'Storing log file for later comparison...' );

    // @see http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property
    s3.putObject({
      Body:        contents,
      Bucket:      config.s3.bucket,
      Key:         config.s3.path,
      ContentType: 'text/plain'
    }, ( error ) => {
      if ( error ) reject( error );
      else resolve( 'Log file saved.' );
    });

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

    log( config.sftp.path, 'Connecting to Papertrail...' );

    // @see https://github.com/kenperkins/winston-papertrail#usage
    // eslint-disable-next-line no-unused-expressions
    require( 'winston-papertrail' ).Papertrail;

    const papertrail = new winston.transports.Papertrail( config.papertrail ),
          logger = new winston.Logger({ transports: [ papertrail ] });

    papertrail.on( 'error', ( error ) => {
      reject( error );
    }).on( 'connect', () => {

      const lines = logLines.split( '\n' );
      const logId = config.papertrail.hostname + ' / ' + config.papertrail.program;
      log( config.sftp.path, 'Logging ' + lines.length + ' lines (' + logId + ')...' );

      lines.forEach( ( line ) => {
        logger.info( line );
        if ( DEBUG ) log( config.sftp.path, line );
      });

      logger.close();
      resolve( 'Logged ' + lines.length + ' lines.' );

    }); // On connect.
  }); // Return Promise.
} // Function sendToPapertrail.

/**
 * Maybe pluralises a string depending on the given number.
 *
 * @param {integer} number  The number you wish to refer to.
 * @param {string} singular The singular term for referring to 1 of number.
 * @param {string} plural   The plural term for referring to 0 or > 1 of number.
 * @returns {string} Either the singular or plural string.
 */
function maybePlural( number, singular, plural ) {
  return 1 === number ? singular : plural; // eslint-disable-line no-magic-numbers
}

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
  if ( defaultValue ) return defaultValue;
  throw new Error( 'Please set ' + envName + '.' );
}

/**
 * A console log wrapping function that only logs if SILENT is not true.
 *
 * @returns {undefined}
 */
function log() {
  if ( SILENT ) return;
  console.log.apply( null, arguments );
}
