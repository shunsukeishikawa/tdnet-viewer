# TDnet Viewer with AI Summary

A Node.js web application that scrapes TDnet (Tokyo Stock Exchange disclosure network) data and provides intelligent AI-powered summaries of disclosure documents.

## Features

- 📊 **Data Scraping**: Automatically scrapes TDnet disclosure information by date
- 🤖 **AI Summaries**: Uses Google Gemini 2.0 Flash to generate intelligent summaries of PDF documents
- 🌐 **Web Interface**: Clean, responsive web interface for browsing disclosures
- 📱 **Mobile Friendly**: Works on desktop and mobile devices
- 🔄 **Auto Pagination**: Automatically handles multiple pages of results
- 📋 **Fallback Mode**: Works without AI for basic text summaries

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Gemini API (Optional but Recommended)

For intelligent AI summaries, you'll need a Google Gemini API key:

1. Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` and add your API key:
   ```
   GEMINI_API_KEY=AIzaSyABC123-your-actual-api-key-here
   ```

### 3. Start the Application
```bash
npm start
```

The application will be available at: `http://localhost:3000`

## Prompt Customization

You can customize the AI analysis prompts without modifying the code:

1. **Edit Prompts**: Modify `prompts.json` to customize:
   - **AI Summary Prompt**: Change analysis style and format
   - **System Prompt**: Adjust AI persona and expertise
   - **Keywords**: Update fallback summary keywords
   - **Metadata**: Customize analysis engine name and disclaimers

2. **Example Customizations**:
   ```json
   {
     "ai_summary": {
       "user_prompt_template": "あなたはカスタムの金融アナリストです。以下の文書を分析してください..."
     }
   }
   ```

3. **Restart Required**: After editing `prompts.json`, restart the server to apply changes

## Usage

1. **Select a Date**: Use the date picker to choose a disclosure date
2. **View Data**: Click "Get TDnet Data" to fetch disclosure information
3. **Generate Summary**: Click the green "要約" (Summary) button on any row to get an AI-powered analysis

## AI Summary Features

The AI summary provides:
- **Document Purpose**: Background and objectives
- **Key Content**: Main announcements and changes
- **Financial Impact**: Effects on performance and finances
- **Important Points**: Notable numbers, forecasts, and risks
- **Classification**: Type of disclosure (earnings, business update, etc.)

## Fallback Mode

If no Gemini API key is configured, the application will:
- Still extract text from PDFs
- Provide basic keyword-based summaries
- Show a note about enhanced AI features being available

## Technical Architecture

- **Backend**: Node.js with Express
- **PDF Processing**: pdf-parse for text extraction
- **AI Analysis**: Google Gemini 2.0 Flash for intelligent summarization
- **Web Scraping**: Python-based scraper for TDnet data
- **Frontend**: Vanilla JavaScript with responsive CSS

## File Structure

```
├── server.js              # Main Express server
├── web_scraper.py         # Python scraper for TDnet
├── package.json           # Node.js dependencies
├── prompts.json           # AI prompt configuration (customizable)
├── public/
│   └── index.html         # Frontend web interface
├── .env.example           # Environment variables template
└── README.md             # This file
```

## Dependencies

- **express**: Web server framework
- **@google/generative-ai**: Google Gemini API client
- **pdf-parse**: PDF text extraction
- **axios**: HTTP client for downloading PDFs
- **dotenv**: Environment variable management

## Development

For development with auto-restart:
```bash
npm run dev
```

## Notes

- The application requires Python 3 for the web scraping functionality
- PDF summaries work best with text-based PDFs (not scanned images)
- **Gemini 2.0 Flash** provides enhanced analytical capabilities and faster processing
- Gemini API is free for moderate usage (15 requests per minute)
- Can process larger documents (up to 30,000 characters) with Gemini 2.0
- The application gracefully handles rate limits and API errors

## License

MIT License