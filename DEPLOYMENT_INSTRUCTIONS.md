# 🚀 GCP Deployment Instructions

## Step 1: Complete Authentication

Since you need a browser for Google Cloud authentication, please run these commands in your terminal:

```bash
# Add gcloud to your PATH (add this to your ~/.zshrc or ~/.bashrc)
export PATH="$PATH:/Users/shunsuke/google-cloud-sdk/bin"

# Authenticate with Google Cloud
gcloud auth login

# Set your project (create one if you don't have it)
gcloud config set project YOUR_PROJECT_ID
```

## Step 2: Create a GCP Project (if needed)

If you don't have a GCP project yet:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Create Project"
3. Enter a project name (e.g., "tdnet-viewer")
4. Note the Project ID (it will be something like "tdnet-viewer-123456")

## Step 3: Enable Billing

**Important**: Cloud Functions require billing to be enabled on your project.

1. Go to [Billing](https://console.cloud.google.com/billing)
2. Link a billing account to your project
3. Don't worry - the serverless architecture should cost less than $5/month for moderate usage

## Step 4: Deploy the Application

Once authentication is complete, run the deployment script:

```bash
cd /Users/shunsuke/dev/iragents
./deploy.sh
```

## Step 5: Configure Gemini AI (Optional)

If you want AI-powered PDF summarization:

1. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Set it as an environment variable:

```bash
gcloud functions deploy tdnet-api \
    --update-env-vars GEMINI_API_KEY=your_gemini_api_key_here
```

## What the Deployment Script Does

The `deploy.sh` script will:

1. ✅ Enable required Google Cloud APIs
2. ✅ Deploy Python scraper function to Cloud Functions
3. ✅ Deploy Node.js API function to Cloud Functions  
4. ✅ Deploy frontend to App Engine
5. ✅ Configure all environment variables
6. ✅ Display your live application URLs

## Expected Output

After deployment, you'll see something like:

```
🎉 Deployment completed successfully!

📍 Your application URLs:
   Frontend:        https://YOUR_PROJECT_ID.uc.r.appspot.com
   API Function:    https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/tdnet-api
   Scraper Function: https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/tdnet-scraper
```

## Cost Estimation

With the serverless architecture:
- **App Engine**: Free tier for low usage
- **Cloud Functions**: ~$0.50-2.00/month for moderate usage
- **Total**: Less than $5/month

## Local Development Still Works

You can continue using local development:

```bash
npm run dev
# Access at http://localhost:3000
```

The frontend automatically detects the environment and uses the appropriate endpoints.

## Troubleshooting

### Common Issues:

1. **"Project not found"**: Make sure you set the correct project ID
2. **"Billing not enabled"**: Enable billing in the Google Cloud Console
3. **"APIs not enabled"**: The script enables them automatically, but you can manually enable:
   - Cloud Functions API
   - App Engine API
   - Cloud Storage API

### View Logs:

```bash
# API function logs
gcloud functions logs read tdnet-api --region=us-central1

# Scraper function logs
gcloud functions logs read tdnet-scraper --region=us-central1

# App Engine logs
gcloud app logs tail -s default
```

## Next Steps

1. Complete the authentication steps above
2. Run `./deploy.sh`
3. Test your live application
4. Optionally configure Gemini AI for PDF summaries

Your application will be live on Google Cloud Platform with automatic scaling and cost-effective serverless architecture!