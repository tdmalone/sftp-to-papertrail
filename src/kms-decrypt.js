
'use strict';

const aws = require( 'aws-sdk' ),
      config = require( './get-config' )(),
      log = require( './utils' ).log;

/**
 * Decrypts an encrypted string with AWS KMS.
 *
 * Returns the string as-is if the execution environment is not AWS Lambda, for example if you are
 * running this function locally, you'll probably have your env vars available in plain text.
 *
 * @param {string} encrypted The encrypted string.
 * @returns {Promise} A Promise to provide the decrypted string.
 */
module.exports = ( encrypted ) => {
  return new Promise( ( resolve, reject ) => {

    if ( ! config.isLambda ) {
      resolve( encrypted );
      return;
    }

    log( 'Decrypting SFTP password...' );

    const kms = new aws.KMS();

    kms.decrypt({ CiphertextBlob: Buffer.from( encrypted, 'base64' ) }, ( error, data ) => {
      if ( error ) reject( error );
      else resolve( data.Plaintext.toString( 'ascii' ) );
    });

  }); // Return Promise.
}; // Function decrypt.
