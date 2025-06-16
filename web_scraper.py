import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Optional
import re

class TdnetScraper:
    def __init__(self):
        self.base_url = "https://www.release.tdnet.info"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })

    def extract_all_pages(self, date: str) -> List[Dict[str, str]]:
        """
        Extract data from all pages for a given date
        
        Args:
            date: Date in format YYYYMMDD (e.g., "20250611")
            
        Returns:
            List of dictionaries containing all extracted data
        """
        all_data = []
        page_num = 1
        
        while True:
            url = f"https://www.release.tdnet.info/inbs/I_list_{page_num:03d}_{date}.html"
            print(f"Scraping page {page_num}: {url}")
            
            page_data = self.extract_table_data(url)
            
            if not page_data:
                print(f"No data found on page {page_num}, stopping pagination")
                break
                
            all_data.extend(page_data)
            page_num += 1
        
        print(f"Total records extracted: {len(all_data)}")
        return all_data

    def extract_table_data(self, url: str) -> List[Dict[str, str]]:
        """
        Extract table data from TDnet disclosure page
        
        Args:
            url: URL of the TDnet page to scrape
            
        Returns:
            List of dictionaries containing extracted data
        """
        try:
            response = self.session.get(url)
            
            # Check for 404 or other HTTP errors
            if response.status_code == 404:
                return []
            
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Find the main list table
            table = soup.find('table', id='main-list-table')
            
            if not table:
                print("Table not found")
                return []
            
            # Look for tbody or directly find rows
            tbody = table.find('tbody')
            if tbody:
                rows = tbody.find_all('tr')
            else:
                rows = table.find_all('tr')
            extracted_data = []
            
            for i, row in enumerate(rows):
                cells = row.find_all(['td', 'th'])
                
                if len(cells) == 7:  # Exact number of expected columns
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
                        len(time) <= 10):  # Filter out pagination text
                        
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
            print(f"Error fetching the page: {e}")
            return []
        except Exception as e:
            print(f"Error parsing the page: {e}")
            import traceback
            traceback.print_exc()
            return []

    def save_to_csv(self, data: List[Dict[str, str]], filename: str = "tdnet_data.csv"):
        """Save extracted data to CSV file"""
        import csv
        
        if not data:
            print("No data to save")
            return
        
        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = ['time', 'code', 'company_name', 'title', 'pdf_url', 'stock_exchange']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            
            writer.writeheader()
            for row in data:
                writer.writerow(row)
        
        print(f"Data saved to {filename}")

def main():
    """Example usage"""
    scraper = TdnetScraper()
    date = "20250611"  # Format: YYYYMMDD
    
    print(f"Scraping all pages for date: {date}")
    data = scraper.extract_all_pages(date)
    
    if data:
        print(f"\nExtracted {len(data)} total records")
        
        # Display first few records
        print("\nFirst 3 records:")
        for i, record in enumerate(data[:3]):
            print(f"\nRecord {i+1}:")
            for key, value in record.items():
                print(f"  {key}: {value}")
        
        # Save to CSV
        filename = f"tdnet_data_{date}.csv"
        scraper.save_to_csv(data, filename)
    else:
        print("No data extracted")

if __name__ == "__main__":
    main()