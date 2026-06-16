import os
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def parse_release_notes():
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    response = requests.get(FEED_URL, headers=headers, timeout=15)
    response.raise_for_status()
    
    root = ET.fromstring(response.content)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    entries = root.findall('atom:entry', ns)
    parsed_items = []
    
    for entry_idx, entry in enumerate(entries):
        title = entry.find('atom:title', ns)
        date_str = title.text if title is not None else "Unknown Date"
        
        updated = entry.find('atom:updated', ns)
        date_iso = updated.text if updated is not None else ""
        
        link_elem = entry.find('atom:link', ns)
        link = link_elem.attrib.get('href') if link_elem is not None else "https://cloud.google.com/bigquery/docs/release-notes"
        
        content_elem = entry.find('atom:content', ns)
        html_content = content_elem.text if content_elem is not None else ""
        
        if not html_content:
            continue
            
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Pre-process links: make relative links absolute
        for a in soup.find_all('a', href=True):
            href = a['href']
            if href.startswith('/'):
                a['href'] = 'https://cloud.google.com' + href
                
        h3s = soup.find_all('h3')
        
        if not h3s:
            # Fallback for entries without h3 headings
            # Get clean text
            plain_text = soup.get_text(separator=' ').strip()
            plain_text = " ".join(plain_text.split())
            
            parsed_items.append({
                "id": f"{entry_idx}_0",
                "date": date_str,
                "date_iso": date_iso,
                "type": "Update",
                "content_html": str(soup),
                "content_text": plain_text,
                "link": link
            })
        else:
            for item_idx, h3 in enumerate(h3s):
                update_type = h3.get_text(strip=True)
                
                # Gather all siblings until the next h3
                sibling_content = []
                sibling = h3.next_sibling
                while sibling and sibling.name != 'h3':
                    if sibling.name:
                        sibling_content.append(str(sibling))
                    elif isinstance(sibling, str) and sibling.strip():
                        # Handle text nodes that aren't inside tags
                        sibling_content.append(sibling.strip())
                    sibling = sibling.next_sibling
                
                item_html = "".join(sibling_content)
                item_soup = BeautifulSoup(item_html, 'html.parser')
                
                # Format plain text with space separator to avoid squashing text
                plain_text = item_soup.get_text(separator=' ').strip()
                # Clean up whitespace/newlines
                plain_text = " ".join(plain_text.split())
                
                # Ensure each item has a unique ID
                item_id = f"item_{entry_idx}_{item_idx}"
                
                parsed_items.append({
                    "id": item_id,
                    "date": date_str,
                    "date_iso": date_iso,
                    "type": update_type,
                    "content_html": item_html,
                    "content_text": plain_text,
                    "link": link
                })
                
    return parsed_items

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    try:
        releases = parse_release_notes()
        return jsonify({
            "status": "success",
            "count": len(releases),
            "data": releases
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == '__main__':
    # Flask app port 5000
    app.run(debug=True, host='0.0.0.0', port=5000)
