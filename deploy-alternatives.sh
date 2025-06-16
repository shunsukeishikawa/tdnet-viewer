#!/bin/bash

# TDnet Viewer - Alternative Deployment Options
# Choose your preferred hosting method

set -e

PROJECT_ID="tdnet-viewer-1750036151"
echo "🚀 Starting TDnet Viewer deployment to GCP..."
echo "🔧 Setting GCP project to: $PROJECT_ID"
gcloud config set project $PROJECT_ID

echo ""
echo "🎯 Choose your deployment option:"
echo "1. App Engine (Current) - Full web hosting"
echo "2. Cloud Storage + CDN - Static hosting only"
echo "3. Firebase Hosting - Fast static hosting"
echo "4. Cloud Run - Containerized deployment"
echo ""

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo "📦 Deploying with App Engine..."
        ./deploy.sh
        ;;
    2)
        echo "🪣 Deploying with Cloud Storage + CDN..."
        
        # Create storage bucket
        gsutil mb gs://$PROJECT_ID-static-site || echo "Bucket may already exist"
        
        # Enable public access
        gsutil iam ch allUsers:objectViewer gs://$PROJECT_ID-static-site
        
        # Upload files
        gsutil -m cp -r public/* gs://$PROJECT_ID-static-site/
        
        # Enable website configuration
        gsutil web set -m index.html -e 404.html gs://$PROJECT_ID-static-site
        
        echo "✅ Static site deployed: https://storage.googleapis.com/$PROJECT_ID-static-site/index.html"
        ;;
    3)
        echo "🔥 Deploying with Firebase Hosting..."
        
        # Install Firebase CLI if not present
        if ! command -v firebase &> /dev/null; then
            echo "Installing Firebase CLI..."
            npm install -g firebase-tools
        fi
        
        # Initialize Firebase (if not done)
        firebase init hosting --project $PROJECT_ID || echo "Firebase already initialized"
        
        # Deploy
        firebase deploy --project $PROJECT_ID
        ;;
    4)
        echo "🏃 Deploying with Cloud Run..."
        
        # Create Dockerfile for static hosting
        cat > Dockerfile << 'EOF'
FROM nginx:alpine
COPY public/ /usr/share/nginx/html/
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
EOF
        
        # Build and deploy
        gcloud run deploy tdnet-viewer \
            --source . \
            --platform managed \
            --region us-central1 \
            --allow-unauthenticated \
            --port 8080
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "🎉 Deployment completed!"