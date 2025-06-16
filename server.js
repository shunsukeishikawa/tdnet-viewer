require('dotenv').config();
const express = require('express');
const { exec } = require('child_process');
const fs = require('fs-extra');
const csv = require('csv-parser');
const path = require('path');
const axios = require('axios');
const pdf = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Load prompt configuration
const promptsConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'prompts.json'), 'utf8'));

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'your-api-key-here');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint to get TDnet data
app.post('/api/tdnet', async (req, res) => {
    const { date } = req.body;
    
    if (!date) {
        return res.status(400).json({ error: 'Date is required' });
    }
    
    // Validate date format (YYYYMMDD)
    if (!/^\d{8}$/.test(date)) {
        return res.status(400).json({ error: 'Date must be in YYYYMMDD format' });
    }
    
    try {
        console.log(`Fetching TDnet data for date: ${date}`);
        
        // Create a modified Python script that accepts date as command line argument
        const pythonScript = `
import sys
import requests
from bs4 import BeautifulSoup
from typing import List, Dict
import json

class TdnetScraper:
    def __init__(self):
        self.base_url = "https://www.release.tdnet.info"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })

    def extract_all_pages(self, date: str) -> List[Dict[str, str]]:
        all_data = []
        page_num = 1
        
        while True:
            url = f"https://www.release.tdnet.info/inbs/I_list_{page_num:03d}_{date}.html"
            page_data = self.extract_table_data(url)
            
            if not page_data:
                break
                
            all_data.extend(page_data)
            page_num += 1
        
        return all_data

    def extract_table_data(self, url: str) -> List[Dict[str, str]]:
        try:
            response = self.session.get(url)
            
            if response.status_code == 404:
                return []
            
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')
            
            table = soup.find('table', id='main-list-table')
            
            if not table:
                return []
            
            tbody = table.find('tbody')
            if tbody:
                rows = tbody.find_all('tr')
            else:
                rows = table.find_all('tr')
            
            extracted_data = []
            
            for row in rows:
                cells = row.find_all(['td', 'th'])
                
                if len(cells) == 7:
                    time = cells[0].get_text(strip=True)
                    code = cells[1].get_text(strip=True)
                    company_name = cells[2].get_text(strip=True)
                    
                    title_cell = cells[3]
                    title_link = title_cell.find('a')
                    if title_link:
                        title = title_link.get_text(strip=True)
                        pdf_url = title_link.get('href')
                        if pdf_url and not pdf_url.startswith('http'):
                            pdf_url = self.base_url + '/inbs/' + pdf_url
                    else:
                        title = title_cell.get_text(strip=True)
                        pdf_url = None
                    
                    stock_exchange = cells[6].get_text(strip=True)
                    
                    if (time and time != "時刻" and code != "コード" and 
                        time != "2025年06月11日に開示された情報" and
                        len(time) <= 10):
                        
                        extracted_data.append({
                            'time': time,
                            'code': code,
                            'company_name': company_name,
                            'title': title,
                            'pdf_url': pdf_url,
                            'stock_exchange': stock_exchange
                        })
            
            return extracted_data
            
        except Exception as e:
            return []

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python script.py <date>")
        sys.exit(1)
    
    date = sys.argv[1]
    scraper = TdnetScraper()
    data = scraper.extract_all_pages(date)
    
    # Output as JSON
    print(json.dumps(data, ensure_ascii=False))
`;

        // Write temporary Python script
        const tempScriptPath = path.join(__dirname, 'temp_scraper.py');
        await fs.writeFile(tempScriptPath, pythonScript);
        
        // Execute Python script
        const command = `python3 "${tempScriptPath}" ${date}`;
        
        exec(command, { maxBuffer: 1024 * 1024 * 10 }, async (error, stdout, stderr) => {
            // Clean up temp file
            await fs.remove(tempScriptPath);
            
            if (error) {
                console.error('Error executing Python script:', error);
                return res.status(500).json({ error: 'Failed to fetch data' });
            }
            
            try {
                const data = JSON.parse(stdout);
                res.json({ success: true, data, count: data.length });
            } catch (parseError) {
                console.error('Error parsing JSON:', parseError);
                res.status(500).json({ error: 'Failed to parse data' });
            }
        });
        
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API endpoint to generate intelligent PDF summary using multimodal LLM
app.post('/api/summary', async (req, res) => {
    const { pdfUrl, title } = req.body;
    
    if (!pdfUrl) {
        return res.status(400).json({ error: 'PDF URL is required' });
    }
    
    try {
        console.log(`Generating AI summary for: ${title}`);
        console.log(`PDF URL: ${pdfUrl}`);
        
        // Download PDF
        const response = await axios.get(pdfUrl, {
            responseType: 'arraybuffer',
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        // Extract text from PDF
        const pdfBuffer = Buffer.from(response.data);
        const pdfData = await pdf(pdfBuffer);
        const pdfText = pdfData.text;
        
        if (!pdfText || pdfText.trim().length === 0) {
            return res.json({ 
                success: true, 
                summary: '申し訳ございませんが、このPDFからテキストを抽出できませんでした。画像ベースのPDFか、保護されたPDFの可能性があります。'
            });
        }
        
        // Check if Gemini API key is configured
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your-api-key-here') {
            console.log('Gemini API key not configured, using fallback summarization');
            const summary = generateTextSummary(pdfText, title);
            return res.json({ 
                success: true, 
                summary: summary + '\n\n※ より詳細な分析のため、Gemini API キーを設定してください。',
                textLength: pdfText.length,
                method: 'fallback'
            });
        }
        
        // Generate intelligent summary using Gemini
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
            res.status(500).json({ error: 'PDFのダウンロードに失敗しました。URLが正しいか確認してください。' });
        } else if (error.message.includes('timeout')) {
            res.status(500).json({ error: 'PDFのダウンロードがタイムアウトしました。' });
        } else if (error.message.includes('API')) {
            // Fallback to simple summarization if AI fails
            try {
                const pdfBuffer = Buffer.from(await axios.get(pdfUrl, { responseType: 'arraybuffer' }).then(r => r.data));
                const pdfData = await pdf(pdfBuffer);
                const fallbackSummary = generateTextSummary(pdfData.text, title);
                res.json({ 
                    success: true, 
                    summary: fallbackSummary + '\n\n※ AI分析に失敗したため、基本的な要約を表示しています。',
                    method: 'fallback'
                });
            } catch (fallbackError) {
                res.status(500).json({ error: 'サマリーの生成に失敗しました。' });
            }
        } else {
            res.status(500).json({ error: 'サマリーの生成に失敗しました。' });
        }
    }
});

// Intelligent AI-powered summarization function using Gemini
async function generateAISummary(text, title) {
    try {
        // Truncate text if too long (Gemini 2.0 has enhanced token limits)
        const maxChars = 30000; // Gemini 2.0 can handle significantly more tokens
        const truncatedText = text.length > maxChars ? text.substring(0, maxChars) + '...' : text;
        
        // Build prompt from configuration
        const prompt = promptsConfig.ai_summary.user_prompt_template
            .replace('{title}', title)
            .replace('{content}', truncatedText);

        // Get the Gemini 2.0 Flash model
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
        
        // Add metadata from configuration
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

// Simple text summarization function
function generateTextSummary(text, title) {
    // Clean and normalize text
    const cleanText = text
        .replace(/\s+/g, ' ')
        .replace(/[\r\n]+/g, '\n')
        .trim();
    
    // Extract key sections and information
    const lines = cleanText.split('\n').filter(line => line.trim().length > 10);
    
    // Look for important sections using keywords from configuration
    const importantSections = [];
    const keywords = promptsConfig.fallback_summary.keywords;
    
    // Find sentences containing keywords
    for (const line of lines.slice(0, 50)) { // Check first 50 lines
        const hasKeyword = keywords.some(keyword => line.includes(keyword));
        if (hasKeyword && line.length > 20 && line.length < 200) {
            importantSections.push(line.trim());
        }
    }
    
    // Generate summary
    let summary = `【${title}】\n\n`;
    
    if (importantSections.length > 0) {
        summary += '■ 主な内容:\n';
        importantSections.slice(0, 5).forEach((section, index) => {
            summary += `${index + 1}. ${section}\n`;
        });
    } else {
        // Fallback: use first few meaningful lines
        const meaningfulLines = lines
            .filter(line => line.length > 30 && line.length < 300)
            .slice(0, 3);
        
        if (meaningfulLines.length > 0) {
            summary += '■ 文書の概要:\n';
            meaningfulLines.forEach((line, index) => {
                summary += `${index + 1}. ${line}\n`;
            });
        } else {
            summary += '■ この文書の詳細な要約を生成できませんでした。\n';
            summary += 'PDFの内容が複雑であるか、構造化されていない可能性があります。\n';
            summary += '直接PDFをご確認ください。\n';
        }
    }
    
    summary += `\n■ 文書情報:\n`;
    summary += `- 文字数: ${cleanText.length.toLocaleString()}文字\n`;
    summary += `- 抽出日時: ${new Date().toLocaleString('ja-JP')}\n`;
    
    return summary;
}

app.listen(PORT, () => {
    console.log(`TDnet Viewer server running on http://localhost:${PORT}`);
});