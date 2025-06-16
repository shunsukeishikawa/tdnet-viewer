const functions = require('@google-cloud/functions-framework');
const axios = require('axios');
const pdf = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Load prompt configuration
let promptsConfig;
try {
  promptsConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'prompts.json'), 'utf8'));
} catch (error) {
  console.error('Error loading prompts.json:', error);
  promptsConfig = {
    ai_summary: {
      user_prompt_template: "Analyze this document: {title}\n\nContent:\n{content}\n\nProvide a summary in Japanese."
    },
    metadata: {
      analysis_engine: "Google Gemini 2.0 Flash",
      disclaimer: "※ この要約はAIによって生成されています。"
    }
  };
}

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '3600'
};

// Main Cloud Function
functions.http('app', async (req, res) => {
  // Set CORS headers
  Object.keys(corsHeaders).forEach(key => {
    res.set(key, corsHeaders[key]);
  });

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const { method, path: urlPath } = req;
  const query = req.query;
  const body = req.body;

  try {
    if (method === 'GET' && urlPath === '/') {
      res.json({ message: 'TDnet Viewer API is running', version: '1.0.0' });
    } else if (method === 'POST' && urlPath === '/api/tdnet') {
      await handleTdnetRequest(req, res);
    } else if (method === 'POST' && urlPath === '/api/summary') {
      await handleSummaryRequest(req, res);
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  } catch (error) {
    console.error('Function error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle TDnet data scraping request
async function handleTdnetRequest(req, res) {
  const { date } = req.body;
  
  if (!date) {
    return res.status(400).json({ error: 'Date is required' });
  }
  
  if (!/^\d{8}$/.test(date)) {
    return res.status(400).json({ error: 'Date must be in YYYYMMDD format' });
  }
  
  try {
    console.log(`Fetching TDnet data for date: ${date}`);
    
    // Call the Python scraper function
    const scraperUrl = process.env.SCRAPER_FUNCTION_URL || 'https://us-central1-tdnet-viewer-1750036151.cloudfunctions.net/tdnet-scraper';
    
    const response = await axios.post(scraperUrl, { date }, {
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    });
    
    res.json(response.data);
    
  } catch (error) {
    console.error('Error calling scraper:', error.message);
    res.status(500).json({ error: 'Failed to fetch TDnet data' });
  }
}

// Handle PDF summary request
async function handleSummaryRequest(req, res) {
  const { pdfUrl, title } = req.body;
  
  if (!pdfUrl) {
    return res.status(400).json({ error: 'PDF URL is required' });
  }
  
  try {
    console.log(`Generating AI summary for: ${title}`);
    
    // Download PDF
    const response = await axios.get(pdfUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TDnet-Viewer/1.0)'
      }
    });
    
    // Extract text from PDF
    const pdfBuffer = Buffer.from(response.data);
    const pdfData = await pdf(pdfBuffer);
    const pdfText = pdfData.text;
    
    if (!pdfText || pdfText.trim().length === 0) {
      return res.json({ 
        success: true, 
        summary: '申し訳ございませんが、このPDFからテキストを抽出できませんでした。'
      });
    }
    
    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY) {
      const fallbackSummary = generateFallbackSummary(pdfText, title);
      return res.json({ 
        success: true, 
        summary: fallbackSummary + '\n\n※ AI分析を利用するには、Gemini API キーを設定してください。',
        method: 'fallback'
      });
    }
    
    // Generate AI summary
    const aiSummary = await generateAISummary(pdfText, title);
    
    res.json({ 
      success: true, 
      summary: aiSummary,
      textLength: pdfText.length,
      method: 'ai'
    });
    
  } catch (error) {
    console.error('Error generating summary:', error.message);
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      res.status(500).json({ error: 'PDFのダウンロードに失敗しました。' });
    } else if (error.message.includes('timeout')) {
      res.status(500).json({ error: 'PDFのダウンロードがタイムアウトしました。' });
    } else {
      res.status(500).json({ error: 'サマリーの生成に失敗しました。' });
    }
  }
}

// AI-powered summarization using Gemini
async function generateAISummary(text, title) {
  try {
    const maxChars = 30000;
    const truncatedText = text.length > maxChars ? text.substring(0, maxChars) + '...' : text;
    
    const prompt = promptsConfig.ai_summary.user_prompt_template
      .replace('{title}', title)
      .replace('{content}', truncatedText);
    
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-001",
      generationConfig: {
        temperature: 0.2,
        topK: 32,
        topP: 0.9,
        maxOutputTokens: 1500,
      },
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiSummary = response.text();
    
    const fullSummary = `${aiSummary}

──────────────────
■ 分析情報
- 文字数: ${text.length.toLocaleString()}文字
- 分析日時: ${new Date().toLocaleString('ja-JP')}
- 分析エンジン: ${promptsConfig.metadata.analysis_engine}

${promptsConfig.metadata.disclaimer}`;

    return fullSummary;
    
  } catch (error) {
    console.error('Gemini API Error:', error.message);
    throw new Error('AI analysis failed: ' + error.message);
  }
}

// Fallback summarization
function generateFallbackSummary(text, title) {
  const cleanText = text.replace(/\s+/g, ' ').trim();
  const lines = cleanText.split('\n').filter(line => line.trim().length > 10);
  
  const keywords = ['概要', '要約', '目的', '結果', '影響', '売上', '利益', '業績'];
  const importantSections = [];
  
  for (const line of lines.slice(0, 50)) {
    const hasKeyword = keywords.some(keyword => line.includes(keyword));
    if (hasKeyword && line.length > 20 && line.length < 200) {
      importantSections.push(line.trim());
    }
  }
  
  let summary = `【${title}】\n\n`;
  if (importantSections.length > 0) {
    summary += '■ 主な内容:\n';
    importantSections.slice(0, 3).forEach((section, index) => {
      summary += `${index + 1}. ${section}\n`;
    });
  } else {
    summary += '■ 基本的な要約を生成できませんでした。\n';
  }
  
  summary += `\n■ 文書情報:\n- 文字数: ${cleanText.length.toLocaleString()}文字\n`;
  
  return summary;
}