# TDnet Viewer - Serverless Deployment

This document explains how to deploy the TDnet Viewer application to Google Cloud Platform using serverless technologies for cost-effective operation.

## Architecture

The serverless architecture consists of:

1. **App Engine** - Hosts the static frontend (HTML/CSS/JS)
2. **Cloud Functions (Node.js)** - Main API for summary generation
3. **Cloud Functions (Python)** - TDnet web scraping service
4. **Google Gemini AI** - PDF summarization (optional)

## Deployment Steps

### Prerequisites

1. Install Google Cloud CLI:
   ```bash
   curl https://sdk.cloud.google.com | bash
   exec -l $SHELL
   gcloud init
   ```

2. Set your GCP project:
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   ```

3. Enable billing for your project (required for Cloud Functions)

### Quick Deployment

Run the automated deployment script:

```bash
./deploy.sh
```

This script will:
- Enable required Google Cloud APIs
- Deploy the Python scraper function
- Deploy the Node.js API function
- Deploy the frontend to App Engine
- Configure environment variables
- Display all deployment URLs

### Manual Deployment

If you prefer to deploy manually:

1. **Deploy Python Scraper Function:**
   ```bash
   cd scraper-function
   gcloud functions deploy tdnet-scraper \
       --runtime=python39 \
       --trigger=http \
       --allow-unauthenticated \
       --memory=512MB \
       --timeout=540s
   ```

2. **Deploy Node.js API Function:**
   ```bash
   cd functions
   gcloud functions deploy tdnet-api \
       --runtime=nodejs18 \
       --trigger=http \
       --allow-unauthenticated \
       --memory=512MB \
       --timeout=540s \
       --set-env-vars="SCRAPER_FUNCTION_URL=SCRAPER_URL_FROM_STEP_1"
   ```

3. **Deploy Frontend:**
   ```bash
   # Update HTML with your project ID
   sed -i "s/YOUR_PROJECT_ID/your-actual-project-id/g" public/index.html
   
   gcloud app deploy app.yaml
   ```

## Configuration

### Gemini AI Setup (Optional)

To enable AI-powered PDF summarization:

```bash
gcloud functions deploy tdnet-api \
    --update-env-vars GEMINI_API_KEY=your_gemini_api_key
```

Get your Gemini API key from: https://aistudio.google.com/app/apikey

### Monitoring and Logs

View function logs:
```bash
# API function logs
gcloud functions logs read tdnet-api --region=us-central1

# Scraper function logs  
gcloud functions logs read tdnet-scraper --region=us-central1

# App Engine logs
gcloud app logs tail -s default
```

## Cost Optimization

This serverless architecture is designed for cost-effectiveness:

- **App Engine**: F1 instance with automatic scaling (free tier eligible)
- **Cloud Functions**: Pay per invocation with 2M free requests/month
- **No persistent servers**: Resources only consumed when in use
- **Automatic scaling**: Scales to zero when not used

Estimated monthly cost for moderate usage (< 100 requests/day):
- App Engine: Free (within free tier limits)
- Cloud Functions: ~$0.50-2.00
- **Total: < $5/month**

## Troubleshooting

### Common Issues

1. **Permission denied errors:**
   ```bash
   gcloud auth application-default login
   ```

2. **Project not found:**
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   gcloud config list
   ```

3. **API not enabled:**
   ```bash
   gcloud services enable cloudfunctions.googleapis.com
   gcloud services enable appengine.googleapis.com
   ```

4. **Function timeout:**
   - Increase timeout: `--timeout=540s`
   - Check function logs for specific errors

### Local Development

For local development, you can still run the original server:

```bash
# Install dependencies
npm install

# Start local server
node server.js
```

The frontend will automatically detect localhost and use local endpoints.

## File Structure

```
├── functions/           # Node.js Cloud Function (API)
│   ├── index.js        
│   ├── package.json    
│   └── prompts.json    
├── scraper-function/    # Python Cloud Function (scraper)
│   ├── main.py         
│   └── requirements.txt
├── public/             # Static frontend files
│   └── index.html      
├── app.yaml            # App Engine configuration
├── deploy.sh           # Automated deployment script
└── .gcloudignore       # Files to exclude from deployment
```

## Updates and Maintenance

To update the application:

1. Make your changes to the code
2. Run `./deploy.sh` again to redeploy
3. Or deploy individual components:
   ```bash
   # Update API only
   cd functions && gcloud functions deploy tdnet-api
   
   # Update scraper only  
   cd scraper-function && gcloud functions deploy tdnet-scraper
   
   # Update frontend only
   gcloud app deploy app.yaml
   ```