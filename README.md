# English Proficiency Exam Evaluator

A web application that evaluates English speaking proficiency using AWS services.

## Overview

This application allows users to upload audio recordings of their English speaking exams and receive detailed evaluations of their proficiency level (A1-C2), including feedback on pronunciation, grammar, vocabulary, and fluency.

## Architecture

The application uses the following AWS services:

- **Amazon S3**: Stores audio recordings, transcriptions, and evaluations
- **Amazon Transcribe**: Converts speech to text with speaker diarization
- **Amazon Bedrock**: Analyzes transcriptions and generates proficiency evaluations
- **Amazon Cognito**: Handles user authentication
- **Amazon CloudFront**: Delivers the web application with low latency
- **AWS Lambda**: Processes recordings and generates evaluations
- **AWS Step Functions**: Orchestrates the evaluation workflow

## Setup Instructions

### Prerequisites

- AWS Account
- Domain name (optional, for custom URL)

### Deployment Steps

1. **Deploy CloudFormation Stack**
   - Use the provided template to create all required resources
   - Note the S3 bucket name from the outputs

2. **Configure Cognito**
   - Create a User Pool and Identity Pool
   - Configure authenticated role permissions for S3 access

3. **Set Up Website Hosting**
   - Create an S3 bucket for website files
   - Configure CloudFront distribution
   - (Optional) Set up Route 53 for custom domain

4. **Upload Website Files**
   - Upload all HTML, CSS, JS files to the website bucket
   - Create an `images` folder and upload the globe image

5. **Update Configuration**
   - Update `config.js` with your AWS region, Cognito IDs, and S3 bucket name

## File Structure

```
/
├── index.html          # Main HTML file
├── styles.css          # CSS styling
├── config.js           # AWS configuration
├── auth.js             # Authentication logic
├── app.js              # Application logic
└── images/
    └── globe.png       # Logo image
```

## Usage

1. Create an account or sign in
2. Upload an audio recording of your English speaking
3. Wait for the system to process the recording
4. View your transcription and proficiency evaluation

## Development

To modify the application:

1. Update the HTML/CSS/JS files locally
2. Test changes in your browser
3. Upload modified files to S3
4. Create a CloudFront invalidation to refresh the cache

## Troubleshooting

- **Authentication Issues**: Check Cognito configuration and browser console
- **Upload Failures**: Verify S3 bucket permissions and CORS settings
- **Processing Errors**: Check CloudWatch logs for Lambda functions

## License

This project is licensed under the MIT License - see the LICENSE file for details.