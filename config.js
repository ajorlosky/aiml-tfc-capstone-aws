// AWS Configuration
const awsConfig = {
    region: 'us-east-1', // Your AWS region
    credentials: new AWS.CognitoIdentityCredentials({
        IdentityPoolId: 'us-east-1:4e6448b0-7c8d-406a-aaed-f41058019dad', // Replace with your Cognito Identity Pool ID
    })
};

// S3 bucket configuration
const s3Config = {
    bucketName: 'evaluator-tool-assetbucket-6nhdsh0eom5g', // Your S3 bucket name
    recordingsPrefix: 'recordings/',
    transcriptionsPrefix: 'transcriptions/'
};

// CloudFront configuration (for accessing the website)
const cloudFrontConfig = {
    distributionDomain: 'd2qqyid878cubt.cloudfront.net' // Replace with your CloudFront distribution domain
};

// Instructions for setup
console.log(`
IMPORTANT SETUP INSTRUCTIONS:
1. Replace the AWS region in config.js with your deployment region
2. Set up proper authentication (Cognito Identity Pool recommended)
3. Add your S3 bucket name from CloudFormation output
4. Configure CORS on your S3 bucket to allow browser uploads
`);