import functions_framework
import requests
from bs4 import BeautifulSoup
import json
from flask import jsonify
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TdnetScraper:
    def __init__(self):
        self.base_url = "https://www.release.tdnet.info"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (compatible; TDnet-Viewer/1.0; +https://github.com/shunsukeishikawa/tdnet-viewer)'
        })

    def extract_all_pages(self, date: str):
        """Extract data from all pages for a given date"""
        all_data = []
        page_num = 1
        
        while True:
            url = f"https://www.release.tdnet.info/inbs/I_list_{page_num:03d}_{date}.html"
            logger.info(f"Scraping page {page_num}: {url}")
            
            page_data = self.extract_table_data(url)
            
            if not page_data:
                logger.info(f"No data found on page {page_num}, stopping pagination")
                break
                
            all_data.extend(page_data)
            page_num += 1
            
            # Safety limit to prevent infinite loops
            if page_num > 20:
                logger.warning("Reached maximum page limit (20)")
                break
        
        logger.info(f"Total records extracted: {len(all_data)}")
        return all_data

    def extract_table_data(self, url: str):
        """Extract table data from TDnet disclosure page"""
        try:
            response = self.session.get(url, timeout=30)
            
            if response.status_code == 404:
                return []
            
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Find the main list table
            table = soup.find('table', id='main-list-table')
            
            if not table:
                logger.warning(f"Table not found for URL: {url}")
                return []
            
            # Look for tbody or directly find rows
            tbody = table.find('tbody')
            if tbody:
                rows = tbody.find_all('tr')
            else:
                rows = table.find_all('tr')
            
            extracted_data = []
            
            for row in rows:
                cells = row.find_all(['td', 'th'])
                
                if len(cells) == 7:  # Expected number of columns
                    # Extract time
                    time = cells[0].get_text(strip=True)
                    
                    # Extract code
                    code = cells[1].get_text(strip=True)
                    
                    # Extract company name
                    company_name = cells[2].get_text(strip=True)
                    
                    # Extract title and URL
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
                    
                    # Extract stock exchange
                    stock_exchange = cells[6].get_text(strip=True)
                    
                    # Skip header rows and invalid data
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
            
        except requests.RequestException as e:
            logger.error(f"Request error for {url}: {e}")
            return []
        except Exception as e:
            logger.error(f"Parsing error for {url}: {e}")
            return []

@functions_framework.http
def tdnet_scraper(request):
    """Cloud Function entry point for TDnet scraping"""
    
    # Set CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '3600'
    }
    
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        return ('', 204, headers)
    
    if request.method != 'POST':
        return jsonify({'error': 'Only POST method is allowed'}), 405, headers
    
    try:
        # Parse request data
        request_json = request.get_json(silent=True)
        if not request_json or 'date' not in request_json:
            return jsonify({'error': 'Date is required in request body'}), 400, headers
        
        date = request_json['date']
        
        # Validate date format
        if not date or len(date) != 8 or not date.isdigit():
            return jsonify({'error': 'Date must be in YYYYMMDD format'}), 400, headers
        
        logger.info(f"Processing TDnet scraping request for date: {date}")
        
        # Create scraper and extract data
        scraper = TdnetScraper()
        data = scraper.extract_all_pages(date)
        
        # Return response
        response_data = {
            'success': True,
            'data': data,
            'count': len(data),
            'date': date
        }
        
        return jsonify(response_data), 200, headers
        
    except Exception as e:
        logger.error(f"Error processing request: {e}")
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500, headers