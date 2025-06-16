#!/bin/bash

# TDnet Viewer - GCP Deployment Script
# This script deploys the application to Google Cloud Platform

set -e  # Exit on any error

echo "🚀 Starting TDnet Viewer deployment to GCP..."

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI is not installed. Please install it first."
    exit 1
fi

# Set the project ID
PROJECT_ID="tdnet-viewer-1750036151"
echo "🔧 Setting GCP project to: $PROJECT_ID"
gcloud config set project $PROJECT_ID

echo "📋 Deploying to project: $PROJECT_ID"

# Enable required APIs
echo "🔧 Enabling required Google Cloud APIs..."
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable appengine.googleapis.com
gcloud services enable storage.googleapis.com

# Deploy Python scraper function
echo "🐍 Deploying Python scraper function..."
cd scraper-function
gcloud functions deploy tdnet-scraper \
    --runtime=python39 \
    --trigger-http \
    --allow-unauthenticated \
    --memory=512MB \
    --timeout=540s \
    --region=us-central1 \
    --no-gen2 \
    --entry-point=tdnet_scraper

SCRAPER_URL=$(gcloud functions describe tdnet-scraper --region=us-central1 --format="value(httpsTrigger.url)")
echo "✅ Scraper function deployed: $SCRAPER_URL"

# Deploy Node.js API function
echo "📦 Deploying Node.js API function..."
cd ../functions

# Set environment variables
echo "🔧 Setting environment variables..."
gcloud functions deploy tdnet-api \
    --runtime=nodejs20 \
    --trigger-http \
    --allow-unauthenticated \
    --memory=512MB \
    --timeout=540s \
    --region=us-central1 \
    --no-gen2 \
    --entry-point=app \
    --set-env-vars="SCRAPER_FUNCTION_URL=$SCRAPER_URL"

API_URL=$(gcloud functions describe tdnet-api --region=us-central1 --format="value(httpsTrigger.url)")
echo "✅ API function deployed: $API_URL"

# Deploy App Engine for static hosting
echo "🌐 Deploying static frontend to App Engine..."
cd ..

# Initialize App Engine if not already done
echo "🔧 Initializing App Engine..."
gcloud app create --region=us-central || echo "App Engine already exists"

# HTML already updated with correct project ID
gcloud app deploy app.yaml --quiet

APP_URL=$(gcloud app describe --format="value(defaultHostname)")
echo "✅ Frontend deployed: https://$APP_URL"

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📍 Your application URLs:"
echo "   Frontend:        https://$APP_URL"
echo "   API Function:    $API_URL"
echo "   Scraper Function: $SCRAPER_URL"
echo ""
echo "💡 To set up Gemini AI (optional):"
echo "   gcloud functions deploy tdnet-api --update-env-vars GEMINI_API_KEY=your_api_key"
echo ""
echo "📚 View logs:"
echo "   gcloud functions logs read tdnet-api --region=us-central1"
echo "   gcloud functions logs read tdnet-scraper --region=us-central1"
echo "   gcloud app logs tail -s default"