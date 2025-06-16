# Local Development Guide

The TDnet Viewer supports both local development and GCP production deployment. Here's how to run it locally for testing.

## How It Works

The frontend automatically detects the environment:

```javascript
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000'           // Local development
    : 'https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/tdnet-api';  // GCP production
```

## Local Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables (Optional)

Create `.env` file for Gemini AI:

```bash
# .env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Start Local Server

```bash
# Option 1: Regular start
npm start

# Option 2: Development mode with auto-reload
npm run dev
```

The application will be available at: http://localhost:3000

## Local vs GCP Comparison

| Feature | Local Development | GCP Production |
|---------|------------------|----------------|
| **Frontend** | http://localhost:3000 | App Engine URL |
| **API** | Express.js server | Cloud Functions |
| **Scraper** | Python subprocess | Cloud Functions |
| **Cost** | Free | ~$5/month |
| **Scaling** | Manual | Automatic |
| **Deployment** | `npm start` | `./deploy.sh` |

## Development Workflow

### Typical Development Cycle:

1. **Local Testing:**
   ```bash
   npm run dev
   # Test changes at http://localhost:3000
   ```

2. **Deploy to GCP:**
   ```bash
   npm run deploy
   # Test on production URLs
   ```

3. **Monitor Production:**
   ```bash
   npm run logs          # API function logs
   npm run logs-scraper  # Scraper function logs
   ```

## Local Development Benefits

- **Fast iteration**: No deployment time
- **Easy debugging**: Console logs visible immediately
- **Cost-free**: No cloud charges during development
- **Full feature parity**: Same functionality as production

## File Structure for Both Environments

```
tdnet-viewer/
├── server.js           # Local Express server
├── web_scraper.py      # Local Python scraper
├── public/
│   └── index.html      # Frontend (works in both environments)
├── functions/          # GCP Cloud Functions
│   ├── index.js
│   └── package.json
├── scraper-function/   # GCP Python Function
│   ├── main.py
│   └── requirements.txt
└── app.yaml           # GCP App Engine config
```

## Testing Both Environments

### Test Local Environment:
```bash
npm run dev
# Visit http://localhost:3000
```

### Test GCP Environment:
```bash
npm run deploy
# Visit your App Engine URL
```

## Environment-Specific Features

### Local Only:
- Console debugging
- File system access
- Direct Python execution

### GCP Only:
- Auto-scaling
- Global availability
- Production logging
- Cost monitoring

## Switching Between Environments

No code changes needed! The application automatically detects and uses the correct endpoints based on the hostname.

Local development continues to work exactly as before, while GCP provides a scalable production environment.