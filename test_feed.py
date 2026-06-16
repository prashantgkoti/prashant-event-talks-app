import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup

url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
try:
    print(f"Fetching {url}...")
    response = requests.get(url, timeout=10)
    root = ET.fromstring(response.content)
    
    # Namespace for Atom feed
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    entries = root.findall('atom:entry', ns)
    print(f"Total entries found: {len(entries)}")
    
    # Let's inspect the first entry
    if entries:
        first_entry = entries[0]
        title = first_entry.find('atom:title', ns).text
        updated = first_entry.find('atom:updated', ns).text
        link_elem = first_entry.find('atom:link', ns)
        link = link_elem.attrib.get('href') if link_elem is not None else ""
        content_elem = first_entry.find('atom:content', ns)
        html_content = content_elem.text if content_elem is not None else ""
        
        print(f"\nEntry Title (Date): {title}")
        print(f"Updated: {updated}")
        print(f"Link: {link}")
        
        # Parse content HTML
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Find all h3 tags (which represent update types like Feature, Issue, etc.)
        h3s = soup.find_all('h3')
        print(f"Number of update items (h3s) in this entry: {len(h3s)}")
        
        for idx, h3 in enumerate(h3s):
            update_type = h3.get_text(strip=True)
            # Find all sibling elements until the next h3
            sibling_content = []
            sibling = h3.next_sibling
            while sibling and sibling.name != 'h3':
                if sibling.name: # Skip NavigableString text nodes that are empty whitespace
                    sibling_content.append(str(sibling))
                sibling = sibling.next_sibling
            
            full_description_html = "".join(sibling_content)
            # Strip tags to get raw text for Tweeting
            plain_text = BeautifulSoup(full_description_html, 'html.parser').get_text(strip=True)
            
            print(f"\n--- Item {idx+1} ---")
            print(f"Type: {update_type}")
            print(f"HTML Content: {full_description_html[:200]}...")
            print(f"Plain Text: {plain_text[:200]}...")
            
except Exception as e:
    print(f"Error: {e}")
