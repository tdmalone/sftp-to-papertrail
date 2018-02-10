# SFTP to Papertrail

An [AWS Lambda](https://aws.amazon.com/lambda/) function that retrieves log files via SFTP, checks for new entries, and sends them to [Papertrail](https://papertrailapp.com/). Uses [S3](https://aws.amazon.com/s3/) for maintaining state.

## Installation

Several manual steps are needed for initial setup. If you want to be able to automatically re-deploy updates later (such as updates you make, or updates you pull down from me), there's also an option to set that up with [Travis CI](https://travis-ci.org/).

Full instructions are coming soon. The steps will look something like this:

1. Create an AWS S3 bucket for remembering the state of old log files
1. Create an AWS Lambda function, setting the runtime to Node.js 6.10
1. Create an AWS User and Role (example policy coming soon)
1. Set your environment variables in your new Lambda function:
    * `STP_SFTP_HOST` eg. ftp.example.com
    * `STP_SFTP_PORT` (if not 22)
    * `STP_SFTP_PATH` eg. logs/access_log
    * `STP_SFTP_USERNAME` eg. ftpuser@example.com
    * `STP_SFTP_PASSWORD` eg. ThisIsNotASecurePassword (you can also encrypt this within Lambda)
    * `STP_PAPERTRAIL_HOST` eg. logs1.papertrailapp.com
    * `STP_PAPERTRAIL_PORT` eg. 12345
    * `STP_S3_BUCKET` eg. example-com-log-storage
    * `STP_S3_REGION` (if not us-east-1)
1. Set the timeout for your function to something larger than the default 3 seconds - you might want to try 1 minute, or even higher if you know you'll have a lot of logs
1. Cron your new Lambda function to run as often as you like (more often means new events get to Papertrail quicker, but also more S3 gets and puts)

Then, for manual deployments:

1. Clone/download this repo to your machine
1. Run `yarn` (or `npm install`) within your copy of the project
1. Zip up everything, and upload it to your Lambda function (under the _Function Code_ heading)
1. Do a test run to make sure it's all working!

OR, for automatic deployments:

1. Fork this repo
1. Log in to Travis CI with your GitHub account and enable your newly forked repo
1. Edit `.travis.yml` and configure your region, function name, role, and AWS access keys (please [encrypt the access key](https://docs.travis-ci.com/user/encryption-keys#Usage))
1. Push your changes to GitHub if you haven't already, and it should build and deploy to AWS
1. Do a test run of the function from your Lambda console to make sure it's all working!

## Updating

If you used the automatic method above, you can make changes to the function (or merge in changes I've made) and every time you push to GitHub, your function will be re-built and deployed automatically.

Otherwise, to update a manual installation, you'll need to pull (or re-download) the repo if you want to get any changes I've made; reinstall dependencies if they've changed (`yarn` or `npm install`); then re-zip and re-upload the function to Lambda.

It's always a good idea to re-test through the Lambda console after updating, just in case something has gone wrong.

## Contributing

Issues and pull requests welcomed. This is my first Lambda function, created to solve a problem I encountered at work; I'd love any improvements.

The easiest way to contribute is to fork and clone the repo locally, install dependencies (`yarn`), and then run `yarn docker-tests` to execute the function locally. You'll be prompted to export some environment variables so the function can do it's thing. You will need access to an SFTP server, an S3 bucket and a Papertrail account to run through everything.

## TODO

- Potentially add support for globbing or listing & downloading entire directories
- Potentially add support for multiple SFTP accounts at once
- Work out the difference between various S3 errors and if it's a connection failure
- Add additional tests with mocked SFTP, Winston and AWS modules
- Link up Docker tests to run through Travis

## License

[MIT](LICENSE).
