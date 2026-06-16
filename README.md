# BigQuery Release Radar

An elegant, real-time web application built with Python Flask and plain vanilla HTML, JavaScript, and CSS that fetches the official Google Cloud BigQuery Release Notes, structures them into granular updates, and provides a customized environment to draft and publish updates directly to X (Twitter).

---

## 🚀 Key Features

*   **Granular Release Notes Parsing**: Converts coarse release logs (grouped by date) into distinct, itemized updates categorized by type: **Features**, **Fixes**, **Issues**, and **Deprecations**.
*   **Real-time Search & Filter**: Instant, client-side keyword searching and category filtering with live badge counters.
*   **Relative Link Resolution**: Automatically rewrites relative paths in feed items to absolute Google Cloud URLs to prevent broken links in the UI.
*   **Smart Tweet Composer**: Drafts updates on the fly with customizable templates (Tech/Feature, Bullet lists, Minimal).
*   **Auto-Truncation**: Automatically trims the text description of the selected updates to fit the remaining space (taking into account emojis, templates, and links) to keep the draft under 280 characters automatically.
*   **Progress Indicators**: Features an SVG circular progress ring that shifts colors (indigo -> amber -> red) as you approach the 280-character limit.
*   **One-Click Share**: Seamlessly copies drafts to the clipboard or opens a pre-filled, editable window via X Web Intent.
*   **Modern Design**: A high-fidelity slate dark mode layout built with CSS Grid and flexbox, using Lucide icons and responsive breakpoints for mobile and desktop screens.

---

## 📁 File Structure

```text
bq-release-notes/
│
├── app.py                # Python Flask Backend (Handles RSS fetching & feed parsing)
├── requirements.txt      # Python dependencies
├── .gitignore            # Git exclusions (pycache, .venv, OS metadata, IDE configs)
├── README.md             # Project documentation (this file)
│
├── templates/
│   └── index.html        # Main HTML layout
│
└── static/
    ├── css/
    │   └── style.css     # Premium dark theme and layout stylesheet
    └── js/
        └── app.js        # Dynamic UI state manager & tweet formatting logic
```

---

## 🛠️ Getting Started

### Prerequisites
*   Python 3.8 or higher
*   Git

### Installation & Run

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/prashantgkoti/prashant-event-talks-app.git
    cd prashant-event-talks-app
    ```

2.  **Set Up Virtual Environment**
    Create and activate a Python virtual environment to isolate dependencies:
    *   **Windows (PowerShell)**:
        ```powershell
        python -m venv .venv
        .venv\Scripts\Activate.ps1
        ```
    *   **macOS / Linux**:
        ```bash
        python3 -m venv .venv
        source .venv/bin/activate
        ```

3.  **Install Dependencies**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Run the Web Application**
    ```bash
    python app.py
    ```

5.  **Access the Dashboard**
    Open your browser and navigate to:
    👉 **[http://localhost:5000](http://localhost:5000)**

---

## 💡 How It Works (Usage Guide)

1.  **Ingesting the Feed**: The application fetches the official XML feed from `https://docs.cloud.google.com/feeds/bigquery-release-notes.xml` on page load. Click the **Refresh** button at the top right to check for new updates.
2.  **Filtering & Searching**: Use the search input to filter by keyword, or click the category pills in the left sidebar to isolate specific updates (e.g. only Features).
3.  **Selecting Updates**: Check the selection boxes on individual cards, or click the **Select to Tweet** button. The updates are added to the Tweet Composer panel on the right.
4.  **Drafting your Tweet**: Choose a template style (🚀 *Tech/Feature*, 📋 *List/Bullets*, 💡 *Minimal*). The composer will generate a post based on your selections and format it.
5.  **Sharing**: Click **Post on X** to open the official pre-filled X compose tab, or click **Copy Text** to copy the content to your clipboard.

---

## 🛠️ Technology Stack

*   **Backend**: Flask (Python), requests (Feed Ingestion), BeautifulSoup4 (HTML Parsing)
*   **Frontend**: Vanilla HTML5, CSS3 (CSS Variables, Flexbox, Grid), Vanilla JavaScript (ES6+)
*   **Iconography**: Lucide Icons CDN
*   **Typography**: Google Fonts (Plus Jakarta Sans & JetBrains Mono)
*   **Sharing API**: X Web Intent API

---

## 📄 License

This project is licensed under the Apache-2.0 License.
