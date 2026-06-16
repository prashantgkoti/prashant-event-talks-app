/**
 * BigQuery Release Radar - Frontend Controller
 * Implements real-time filtering, card selections, tweet auto-generation,
 * and responsive UI state management.
 */

document.addEventListener('DOMContentLoaded', () => {
    // State management
    let allReleases = [];
    let filteredReleases = [];
    let selectedReleases = new Map(); // Map of id -> release object
    let currentFilterType = 'all';
    let currentSearchQuery = '';
    let currentTemplate = 'feature'; // 'feature', 'bullet', 'minimal'
    
    // Progress ring dimensions for character counter
    const progressCircle = document.getElementById('charProgressCircle');
    const radius = progressCircle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    
    // Initialize progress ring
    progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
    progressCircle.style.strokeDashoffset = circumference;

    // DOM Elements
    const feedList = document.getElementById('feedList');
    const refreshBtn = document.getElementById('refreshBtn');
    const refreshIcon = document.getElementById('refreshIcon');
    const syncStatus = document.getElementById('syncStatus');
    const lastRefreshedTime = document.getElementById('lastRefreshedTime');
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');
    const categoryFilters = document.getElementById('categoryFilters');
    const emptyState = document.getElementById('emptyState');
    const feedHeadline = document.getElementById('feedHeadline');
    const resultsMeta = document.getElementById('resultsMeta');
    
    // Stat elements
    const statTotal = document.getElementById('statTotal');
    const statLast30 = document.getElementById('statLast30');
    const countAll = document.getElementById('count-all');
    const countFeature = document.getElementById('count-feature');
    const countFix = document.getElementById('count-fix');
    const countIssue = document.getElementById('count-issue');
    const countDeprecation = document.getElementById('count-deprecation');
    const countUpdate = document.getElementById('count-update');

    // Selection elements
    const selectAllBtn = document.getElementById('selectAllBtn');
    const clearSelectionBtn = document.getElementById('clearSelectionBtn');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    
    // Theme elements
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeIcon = document.getElementById('themeIcon');
    
    // Composer elements
    const selectedCount = document.getElementById('selectedCount');
    const selectedItemsList = document.getElementById('selectedItemsList');
    const tweetTextArea = document.getElementById('tweetTextArea');
    const autoComposeBtn = document.getElementById('autoComposeBtn');
    const charCount = document.getElementById('charCount');
    const charWarning = document.getElementById('charWarning');
    const copyTweetBtn = document.getElementById('copyTweetBtn');
    const tweetBtn = document.getElementById('tweetBtn');
    const toastContainer = document.getElementById('toastContainer');
    const templateOptions = document.querySelectorAll('.template-option');

    // Initialize theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        if (themeIcon) themeIcon.setAttribute('data-lucide', 'moon');
    } else {
        if (themeIcon) themeIcon.setAttribute('data-lucide', 'sun');
    }

    // Initialize the app
    fetchReleases();

    // Event Listeners
    refreshBtn.addEventListener('click', fetchReleases);
    
    // Theme toggle listener
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const isLight = document.body.classList.toggle('light-theme');
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
            if (themeIcon) themeIcon.setAttribute('data-lucide', isLight ? 'moon' : 'sun');
            lucide.createIcons();
            showToast(`${isLight ? 'Light' : 'Dark'} theme activated!`, 'success');
        });
    }

    // Export CSV listener
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', exportToCSV);
    }
    
    // Search event listeners
    searchInput.addEventListener('input', (e) => {
        currentSearchQuery = e.target.value.toLowerCase().trim();
        clearSearch.style.display = currentSearchQuery.length > 0 ? 'flex' : 'none';
        applyFilters();
    });

    clearSearch.addEventListener('click', () => {
        searchInput.value = '';
        currentSearchQuery = '';
        clearSearch.style.display = 'none';
        applyFilters();
        searchInput.focus();
    });

    // Category filter event listeners
    categoryFilters.addEventListener('click', (e) => {
        const button = e.target.closest('.filter-pill');
        if (!button) return;
        
        // Update active class
        document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        currentFilterType = button.getAttribute('data-type');
        applyFilters();
    });

    // Select all / clear buttons
    selectAllBtn.addEventListener('click', selectAllFiltered);
    clearSelectionBtn.addEventListener('click', clearAllSelections);
    
    // Composer text area input listener
    tweetTextArea.addEventListener('input', updateCharCounter);

    // Template selector
    templateOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            templateOptions.forEach(btn => btn.classList.remove('active'));
            opt.classList.add('active');
            currentTemplate = opt.getAttribute('data-template');
            autoComposeTweet();
        });
    });

    // Auto-compose button
    autoComposeBtn.addEventListener('click', () => {
        if (selectedReleases.size === 0) {
            showToast('Select updates first to auto-compose!', 'error');
            return;
        }
        autoComposeTweet();
        showToast('Tweet content refreshed!', 'success');
    });

    // Action buttons
    copyTweetBtn.addEventListener('click', copyTweetToClipboard);
    tweetBtn.addEventListener('click', postOnX);
    
    document.getElementById('resetFiltersBtn').addEventListener('click', () => {
        searchInput.value = '';
        currentSearchQuery = '';
        clearSearch.style.display = 'none';
        
        document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.filter-pill[data-type="all"]').classList.add('active');
        currentFilterType = 'all';
        
        applyFilters();
    });

    // API Functions: Fetch Release Notes
    function fetchReleases() {
        setLoadingState(true);
        fetch('/api/releases')
            .then(res => res.json())
            .then(res => {
                if (res.status === 'success') {
                    allReleases = res.data;
                    updateStats();
                    applyFilters();
                    setLastRefreshed();
                    showToast('Successfully updated release notes.', 'success');
                } else {
                    throw new Error(res.message || 'Unknown server error');
                }
            })
            .catch(err => {
                console.error(err);
                showToast(`Failed to fetch updates: ${err.message}`, 'error');
                showEmptyState(true);
            })
            .finally(() => {
                setLoadingState(false);
            });
    }

    // Set UI Loading State
    function setLoadingState(isLoading) {
        if (isLoading) {
            refreshIcon.classList.add('animate-spin');
            refreshBtn.disabled = true;
            syncStatus.querySelector('.status-dot').className = 'status-dot loading';
            syncStatus.querySelector('.status-text').textContent = 'Fetching feed...';
            
            // Render loading skeletons
            feedList.innerHTML = `
                <div class="skeleton-card"></div>
                <div class="skeleton-card"></div>
                <div class="skeleton-card"></div>
            `;
            emptyState.style.display = 'none';
        } else {
            refreshIcon.classList.remove('animate-spin');
            refreshBtn.disabled = false;
            syncStatus.querySelector('.status-dot').className = 'status-dot online';
            syncStatus.querySelector('.status-text').textContent = 'Connected';
        }
    }

    // Set last checked timestamp
    function setLastRefreshed() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        lastRefreshedTime.textContent = `Last checked: today at ${timeStr}`;
    }

    // Update stats counters in sidebar
    function updateStats() {
        // Total count
        statTotal.textContent = allReleases.length;
        countAll.textContent = allReleases.length;
        
        // Count by type
        const counts = { Feature: 0, Fix: 0, Issue: 0, Deprecation: 0, Update: 0 };
        let countLast30 = 0;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        allReleases.forEach(item => {
            // Count categories
            if (counts.hasOwnProperty(item.type)) {
                counts[item.type]++;
            } else {
                counts['Update']++;
            }
            
            // Count last 30 days
            try {
                if (item.date_iso) {
                    const itemDate = new Date(item.date_iso);
                    if (itemDate >= thirtyDaysAgo) {
                        countLast30++;
                    }
                }
            } catch (e) {
                console.error(e);
            }
        });
        
        statLast30.textContent = countLast30;
        countFeature.textContent = counts.Feature;
        countFix.textContent = counts.Fix;
        countIssue.textContent = counts.Issue;
        countDeprecation.textContent = counts.Deprecation;
        countUpdate.textContent = counts.Update;
    }

    // Apply Filter & Search parameters to list
    function applyFilters() {
        filteredReleases = allReleases.filter(item => {
            // Filter by type
            const matchesType = currentFilterType === 'all' || item.type === currentFilterType;
            
            // Filter by query
            const matchesQuery = !currentSearchQuery || 
                item.date.toLowerCase().includes(currentSearchQuery) ||
                item.type.toLowerCase().includes(currentSearchQuery) ||
                item.content_text.toLowerCase().includes(currentSearchQuery);
                
            return matchesType && matchesQuery;
        });

        // Update Headline metadata
        let typeName = currentFilterType === 'all' ? 'All' : currentFilterType + 's';
        if (currentFilterType === 'Update') typeName = 'Other Updates';
        
        feedHeadline.textContent = `${typeName}`;
        resultsMeta.textContent = `Showing ${filteredReleases.length} of ${allReleases.length} updates`;
        
        // Toggle Clear Selection visibility
        updateSelectionActionButtons();
        
        if (filteredReleases.length === 0) {
            showEmptyState(true);
        } else {
            showEmptyState(false);
            renderFeed();
        }
    }

    function showEmptyState(show) {
        if (show) {
            feedList.innerHTML = '';
            emptyState.style.display = 'block';
        } else {
            emptyState.style.display = 'none';
        }
    }

    // Render the updates feed, grouping by date
    function renderFeed() {
        feedList.innerHTML = '';
        let lastDate = '';
        
        filteredReleases.forEach(item => {
            // Insert date grouping header if date changes
            if (item.date !== lastDate) {
                const dateHeader = document.createElement('div');
                dateHeader.className = 'date-group-header';
                dateHeader.textContent = item.date;
                feedList.appendChild(dateHeader);
                lastDate = item.date;
            }

            // Create card element
            const card = document.createElement('article');
            const isSelected = selectedReleases.has(item.id);
            card.className = `release-card${isSelected ? ' selected' : ''}`;
            card.id = `card_${item.id}`;
            card.setAttribute('data-id', item.id);

            // Card Body
            card.innerHTML = `
                <div class="card-select-overlay">
                    <label class="checkbox-container">
                        <input type="checkbox" class="card-checkbox" data-id="${item.id}" ${isSelected ? 'checked' : ''}>
                        <span class="checkmark"></span>
                    </label>
                </div>
                <header class="card-header">
                    <div class="card-header-left">
                        <span class="type-badge ${getTypeClass(item.type)}">${item.type}</span>
                        <span class="card-date">${item.date}</span>
                    </div>
                    <div class="card-header-right">
                        <a href="${item.link}" target="_blank" class="btn btn-text btn-sm" title="View official release documentation">
                            <i data-lucide="external-link"></i>
                        </a>
                    </div>
                </header>
                <div class="card-body">
                    ${item.content_html}
                </div>
                <footer class="card-footer" style="gap: 8px;">
                    <button class="btn btn-secondary btn-sm copy-card-btn" data-id="${item.id}" title="Copy this update to clipboard">
                        <i data-lucide="copy"></i>
                        <span>Copy</span>
                    </button>
                    <button class="btn btn-secondary btn-sm select-toggle-btn" data-id="${item.id}">
                        <i data-lucide="${isSelected ? 'check-square' : 'square'}"></i>
                        <span>${isSelected ? 'Selected' : 'Select to Tweet'}</span>
                    </button>
                </footer>
            `;

            // Card selection event: clicking checkbox
            const checkbox = card.querySelector('.card-checkbox');
            checkbox.addEventListener('change', (e) => {
                toggleSelection(item.id, e.target.checked);
            });

            // Card selection event: clicking footer select button
            const toggleBtn = card.querySelector('.select-toggle-btn');
            toggleBtn.addEventListener('click', () => {
                const currentChecked = selectedReleases.has(item.id);
                toggleSelection(item.id, !currentChecked);
            });

            // Card copy event
            const copyBtn = card.querySelector('.copy-card-btn');
            copyBtn.addEventListener('click', () => {
                copyCardContent(item.id);
            });

            feedList.appendChild(card);
        });

        // Recreate vector icons for new DOM elements
        lucide.createIcons();
    }

    function getTypeClass(type) {
        switch(type) {
            case 'Feature': return 'feature';
            case 'Fix': return 'fix';
            case 'Issue': return 'issue';
            case 'Deprecation': return 'deprecation';
            default: return 'update';
        }
    }

    // Toggle card selection state
    function toggleSelection(id, forceSelect) {
        const release = allReleases.find(r => r.id === id);
        if (!release) return;

        const card = document.getElementById(`card_${id}`);
        const checkbox = card ? card.querySelector('.card-checkbox') : null;
        const toggleBtn = card ? card.querySelector('.select-toggle-btn') : null;

        if (forceSelect) {
            selectedReleases.set(id, release);
            if (card) card.classList.add('selected');
            if (checkbox) checkbox.checked = true;
            if (toggleBtn) {
                toggleBtn.querySelector('i').setAttribute('data-lucide', 'check-square');
                toggleBtn.querySelector('span').textContent = 'Selected';
            }
        } else {
            selectedReleases.delete(id);
            if (card) card.classList.remove('selected');
            if (checkbox) checkbox.checked = false;
            if (toggleBtn) {
                toggleBtn.querySelector('i').setAttribute('data-lucide', 'square');
                toggleBtn.querySelector('span').textContent = 'Select to Tweet';
            }
        }

        // Recreate icons for changed buttons
        lucide.createIcons();

        // Update Composer UI elements
        updateComposerSelectedList();
        autoComposeTweet();
        updateSelectionActionButtons();
    }

    // Update the "Clear Selection" and "Select All" headers
    function updateSelectionActionButtons() {
        if (selectedReleases.size > 0) {
            clearSelectionBtn.style.display = 'inline-flex';
        } else {
            clearSelectionBtn.style.display = 'none';
        }
    }

    // Select all items currently shown in the filtered feed
    function selectAllFiltered() {
        filteredReleases.forEach(item => {
            toggleSelection(item.id, true);
        });
        showToast(`Selected all ${filteredReleases.length} filtered updates.`, 'success');
    }

    // Deselect all selections
    function clearAllSelections() {
        const keys = Array.from(selectedReleases.keys());
        keys.forEach(id => {
            toggleSelection(id, false);
        });
        showToast('Cleared all selections.', 'success');
    }

    // Update sidebar selected pills inside the Tweet Composer panel
    function updateComposerSelectedList() {
        selectedCount.textContent = selectedReleases.size;
        
        if (selectedReleases.size === 0) {
            selectedItemsList.innerHTML = `
                <div class="no-selections-msg">
                    <i data-lucide="check-square"></i>
                    <p>Select updates from the feed to start drafting your tweet.</p>
                </div>
            `;
            lucide.createIcons();
            
            // Disable buttons
            copyTweetBtn.disabled = true;
            tweetBtn.disabled = true;
            return;
        }

        // Enable action buttons
        copyTweetBtn.disabled = false;
        tweetBtn.disabled = false;

        // Render selected items
        selectedItemsList.innerHTML = '';
        selectedReleases.forEach((item, id) => {
            const pill = document.createElement('div');
            pill.className = 'selected-pill';
            pill.innerHTML = `
                <div class="selected-pill-content">
                    <span class="selected-pill-type ${getTypeClass(item.type)}">${item.type}</span>
                    <span class="selected-pill-text">${item.content_text}</span>
                </div>
                <button class="selected-pill-remove" data-id="${id}" title="Deselect this update">
                    <i data-lucide="x"></i>
                </button>
            `;

            pill.querySelector('.selected-pill-remove').addEventListener('click', () => {
                toggleSelection(id, false);
            });

            selectedItemsList.appendChild(pill);
        });

        lucide.createIcons();
    }

    // Auto-generate tweet content based on selections and active template
    function autoComposeTweet() {
        if (selectedReleases.size === 0) {
            tweetTextArea.value = '';
            updateCharCounter();
            return;
        }

        const selectedList = Array.from(selectedReleases.values());
        let composedText = '';

        // Standard link of the latest release notes, or specific if 1 selected
        const primaryLink = selectedList[0].link;
        
        // Base lengths (X Web intent handles text encoding automatically)
        const linkLength = primaryLink.length;

        if (selectedList.length === 1) {
            const item = selectedList[0];
            const cleanText = cleanTextForTweet(item.content_text);

            switch (currentTemplate) {
                case 'feature':
                    const prefix = getEmojiForType(item.type) + ` BigQuery ${item.type}: `;
                    const detailsStr = `\n\nDetails: `;
                    // Calculate available chars for description (limit 280)
                    const availableLength = 280 - prefix.length - detailsStr.length - linkLength;
                    const truncatedText = truncateString(cleanText, availableLength);
                    composedText = `${prefix}${truncatedText}${detailsStr}${primaryLink}`;
                    break;

                case 'bullet':
                    const bulletPrefix = `📋 BigQuery Update:\n• `;
                    const bulletSuffix = `\n\nRead more: `;
                    const bulletAvailable = 280 - bulletPrefix.length - bulletSuffix.length - linkLength;
                    const bulletTrunc = truncateString(cleanText, bulletAvailable);
                    composedText = `${bulletPrefix}${bulletTrunc}${bulletSuffix}${primaryLink}`;
                    break;

                case 'minimal':
                default:
                    const minPrefix = `💡 BigQuery: `;
                    const minSuffix = ` ${primaryLink}`;
                    const minAvailable = 280 - minPrefix.length - minSuffix.length;
                    const minTrunc = truncateString(cleanText, minAvailable);
                    composedText = `${minPrefix}${minTrunc}${minSuffix}`;
                    break;
            }
        } else {
            // Multi-select templates (Summarize list of updates)
            let header = '';
            let bulletLines = [];

            switch (currentTemplate) {
                case 'feature':
                    header = `🚀 Latest BigQuery Updates:\n`;
                    break;
                case 'bullet':
                    header = `📋 BigQuery release roundup:\n`;
                    break;
                case 'minimal':
                default:
                    header = `💡 BigQuery Updates:\n`;
                    break;
            }

            const footer = `\n\nDocs: ${primaryLink}`;
            let currentDraft = header;

            // Build list within character limit
            selectedList.forEach((item, index) => {
                const bulletChar = getEmojiForType(item.type) + " ";
                const cleanItemText = cleanTextForTweet(item.content_text);
                bulletLines.push({ type: item.type, text: cleanItemText, emoji: bulletChar });
            });

            // Iterate and add as many bullets as can fit within 280 characters
            let bulletsAdded = 0;
            let formattedBullets = '';
            
            for (let i = 0; i < bulletLines.length; i++) {
                const line = bulletLines[i];
                // Try compiling draft
                const testBullet = `• [${line.type}] ${line.text}\n`;
                const tempComposed = header + formattedBullets + testBullet + footer;

                if (tempComposed.length <= 280) {
                    formattedBullets += testBullet;
                    bulletsAdded++;
                } else {
                    // Try a shorter version (truncating the current line)
                    const remainingSpace = 280 - (header + formattedBullets + footer).length;
                    if (remainingSpace > 30) { // If there's meaningful space left
                        const bulletHeader = `• [${line.type}] `;
                        const lineAvail = remainingSpace - bulletHeader.length - 6; // buffer for dots and newline
                        if (lineAvail > 10) {
                            const shortLine = bulletHeader + truncateString(line.text, lineAvail) + '\n';
                            formattedBullets += shortLine;
                            bulletsAdded++;
                        }
                    }
                    break; // Can't fit more items
                }
            }

            if (bulletsAdded === 0) {
                // Absolute fallback (just truncate first item)
                const first = bulletLines[0];
                composedText = `${header}• ${truncateString(first.text, 180)}${footer}`;
            } else {
                composedText = `${header}${formattedBullets}${footer}`;
            }
        }

        tweetTextArea.value = composedText;
        updateCharCounter();
    }

    // Helper: clean up spacing and formatting issues in parsed HTML texts
    function cleanTextForTweet(text) {
        return text
            .replace(/\s+/g, ' ')
            .replace(/Learn More/gi, '')
            .replace(/Read More/gi, '')
            .trim();
    }

    // Helper: Truncate a string to a max length adding ellipses if needed
    function truncateString(str, maxLength) {
        if (str.length <= maxLength) return str;
        return str.substring(0, maxLength - 3).trim() + '...';
    }

    // Helper: Get type-specific emoji
    function getEmojiForType(type) {
        switch(type) {
            case 'Feature': return '🚀';
            case 'Fix': return '🛠️';
            case 'Issue': return '⚠️';
            case 'Deprecation': return '🛑';
            default: return '📢';
        }
    }

    // Update Tweet character counter and circular progress ring
    function updateCharCounter() {
        const text = tweetTextArea.value;
        const count = text.length;
        charCount.textContent = `${count} / 280`;

        // Calculate progress percentage
        const percent = Math.min((count / 280) * 100, 100);
        const offset = circumference - (percent / 100) * circumference;
        progressCircle.style.strokeDashoffset = offset;

        // Apply color based on limits
        if (count > 280) {
            progressCircle.style.stroke = '#ef4444'; // Red
            charCount.style.color = '#ef4444';
            charWarning.style.display = 'inline';
            tweetBtn.disabled = true; // Disable tweeting when exceeding character limit
        } else if (count > 250) {
            progressCircle.style.stroke = '#f59e0b'; // Amber/Yellow warning
            charCount.style.color = '#f59e0b';
            charWarning.style.display = 'none';
            tweetBtn.disabled = selectedReleases.size === 0;
        } else {
            progressCircle.style.stroke = '#6366f1'; // Normal Blue/Indigo
            charCount.style.color = 'var(--text-secondary)';
            charWarning.style.display = 'none';
            tweetBtn.disabled = count === 0; // Disable only when empty or no selection
        }
    }

    // Action: Copy Tweet content to system clipboard
    function copyTweetToClipboard() {
        const tweetText = tweetTextArea.value;
        if (!tweetText) return;

        navigator.clipboard.writeText(tweetText)
            .then(() => {
                showToast('Tweet copied to clipboard!', 'success');
            })
            .catch(err => {
                console.error(err);
                showToast('Failed to copy to clipboard.', 'error');
            });
    }

    // Action: Post on X using Web Intent
    function postOnX() {
        const tweetText = tweetTextArea.value;
        if (!tweetText || tweetText.length > 280) return;

        const encodedText = encodeURIComponent(tweetText);
        const twitterUrl = `https://x.com/intent/tweet?text=${encodedText}`;
        
        window.open(twitterUrl, '_blank', 'noopener,noreferrer');
        showToast('Opening X (Twitter) compose window...', 'success');
    }

    // Action: Toast notification manager
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let iconName = 'info';
        if (type === 'success') iconName = 'check-circle';
        if (type === 'error') iconName = 'alert-triangle';

        toast.innerHTML = `
            <i data-lucide="${iconName}"></i>
            <span>${message}</span>
            <button class="toast-close"><i data-lucide="x"></i></button>
        `;

        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.remove();
        });

        toastContainer.appendChild(toast);
        lucide.createIcons();

        // Auto remove toast after 4 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'slideOut 0.3s forwards';
                setTimeout(() => toast.remove(), 300);
            }
        }, 4000);
    }

    // Action: Copy single card content to clipboard
    function copyCardContent(id) {
        const item = allReleases.find(r => r.id === id);
        if (!item) return;
        const copyText = `BigQuery Update (${item.date}) - [${item.type}]:\n${item.content_text}\n\nLink: ${item.link}`;
        
        navigator.clipboard.writeText(copyText)
            .then(() => {
                showToast('Update details copied to clipboard!', 'success');
            })
            .catch(err => {
                console.error(err);
                showToast('Failed to copy update details.', 'error');
            });
    }

    // Action: Export filtered release notes to CSV
    function exportToCSV() {
        if (filteredReleases.length === 0) {
            showToast('No updates to export!', 'error');
            return;
        }
        const headers = ["Date", "Type", "Description", "URL"];
        const rows = filteredReleases.map(item => [
            item.date,
            item.type,
            item.content_text,
            item.link
        ]);
        
        let csvContent = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\n";
        rows.forEach(row => {
            csvContent += row.map(val => `"${(val || '').replace(/"/g, '""')}"`).join(",") + "\n";
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `bigquery_release_notes_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Exported CSV successfully!', 'success');
    }
});
