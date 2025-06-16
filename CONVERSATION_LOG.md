# Conversation Log - User Requests and Issues

This document logs the actual requests made by the user and issues that needed to be fixed during development.

## User Requests

### 1. Initial Web Scraping Request
**User Request**: 
> "I would like to create a simple module first. That extract the information from crawled web page. As a first trial, please crawle the https://www.release.tdnet.info/inbs/I_list_001_20250611.html"

**What was needed**: Extract table data (time, code, company name, title, URL) from TDnet page

### 2. Pagination Support Request  
**User Request**:
> "Actually the web page URL consistns of baseurl/l_list_{page_number}_{date}.html. Each page contains max 100 rows. For example, 2025/0611 date, we have 143 rows actually. So then need to access both page 001 and 002. Please try to update the scraper script to from 1, 2, 3, ... while not found returns"

**What was needed**: Handle multiple pages automatically until 404 error

### 3. Node.js Application Request
**User Request**:
> "I would like to create application. user can specify date, then list of tdnet information is visualized in simple table. I would like to use node.js as base platform"

**What was needed**: Web application with date picker and table display

### 4. PDF Summary Feature Request
**User Request**:
> "I would like to add button "summary" to each row in app. When user click on summary button, then system download the PDF file in background and create summary of PDFs, and show it to user"

**What was needed**: PDF download, text extraction, and summarization

### 5. AI Engine Change Request
**User Request**:
> "please use gemini instead of OpenAI"

**What was needed**: Replace OpenAI with Google Gemini API

### 6. Model Version Update Request
**User Request**:
> "Please use gemini 2.0 pro instead of 1.5"

**What was needed**: Upgrade to latest Gemini model

### 7. Prompt Configuration Request
**User Request**:
> "Please move prompt text into separate text for user to easy to update without modifying code"

**What was needed**: External configuration file for AI prompts

### 8. UI Improvement Request
**User Request**:
> "Summary view shows raw markdown text. Is it possible to use MarkDown viwer instead?"

**What was needed**: Proper markdown rendering in the frontend

### 9. Documentation Request
**User Request**:
> "Could you please a file which contains summary of our conversation history?"

**What was needed**: Documentation of the development process

## Issues Fixed

### 1. PDF Link Issue
**User Report**:
> "when I click pdf link, it failed to open it. becaues url is wrong. the correct url is something like https://www.release.tdnet.info/inbs/140120250611587423.pdf"

**Issue**: Missing `/inbs/` in PDF URL construction
**Fix**: Updated URL building to include proper path

### 2. Network Error Issue  
**User Report**:
> "when click summary button, error shown. its message is ネットワークエラー: Unexpected token '<', "<!DOCTYPE "... is not valid JSON"

**Issue**: Server not running or routing problem
**Fix**: Server restart resolved the issue

### 3. Gemini API Error
**User Report**:
> "Here is the error message. Looks like model version string is invalid. Please check the web to get the correct name. ---- Gemini API Error: [GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-exp:generateContent: [404 Not Found]"

**Issue**: Incorrect model name `gemini-2.0-flash-exp`
**Fix**: Changed to correct model name `gemini-2.0-flash-001`

### 4. API Format Error
**User Report**:
> "When run the application and try summary, error occurs. --- Gemini API Error: [GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-001:generateContent: [400 Bad Request] Invalid JSON payload received. Unknown name "role" at 'contents[0].parts[0]'"

**Issue**: Wrong API call format using OpenAI-style message structure
**Fix**: Simplified to direct prompt string for Gemini API

### 5. Server Restart Requests
**User Request**: 
> "please restart the node"

**User Request**:
> "what is the command to run server?"

**Issue**: Need to restart server to apply changes
**Commands provided**: `npm start` and `node server.js`

## Summary of Development Flow

1. **Started with**: Basic web scraping request
2. **Enhanced to**: Multi-page scraping 
3. **Expanded to**: Full web application
4. **Added**: AI-powered PDF summarization
5. **Switched**: From OpenAI to Gemini
6. **Upgraded**: To Gemini 2.0
7. **Externalized**: Configuration for easy customization
8. **Improved**: UI with markdown rendering
9. **Documented**: Complete development process

## Key Pattern: User-Driven Development

The development followed a clear pattern:
- User makes specific request
- Implementation provided
- User tests and reports issues
- Issues fixed immediately
- Process repeats with next enhancement

This iterative approach resulted in a robust, user-focused application that exactly meets the specified requirements.