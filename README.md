# sftp-to-papertrail

A Node module that retrieves log files via SFTP, and logs new entries to Papertrail. Deploys to AWS Lambda and uses S3 for maintaining state.

## Installation

Coming soon.

Manual installation will look something like: create an AWS user, role and Lambda function; clone or download this repo to your machine; run yarn (or npm install); zip it all up; upload it to Lambda; set your env vars; do a test run; cron the function!

Automatic installation will look something like: create an AWS user and role; fork this repo; edit `.travis.yml` and configure your region, desired function name, role and AWS access keys; log in to Travis CI and enable your repo; push to GitHub.

## Updating

Coming soon. Will depend on your installation method.

## License

[MIT](LICENSE).
