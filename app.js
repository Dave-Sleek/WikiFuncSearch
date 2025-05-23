document.addEventListener('DOMContentLoaded', () => {
  // Load required libraries for PDF generation
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  document.head.appendChild(script);
  
  const script2 = document.createElement('script');
  script2.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  document.head.appendChild(script2);

  // Dark Mode Toggle
  const darkModeToggle = document.getElementById('darkModeToggle');
  const storedDarkMode = localStorage.getItem('darkMode') === 'true';

  if (darkModeToggle) {
    if (storedDarkMode) {
      document.body.classList.add('dark-mode');
      darkModeToggle.checked = true;
    }

    darkModeToggle.addEventListener('change', (e) => {
      document.body.classList.toggle('dark-mode', e.target.checked);
      localStorage.setItem('darkMode', e.target.checked);
    });
  }

  // Speech Synthesis Setup
  let speechSynthesis = window.speechSynthesis;
  let currentUtterance = null;

  function readAloud(text) {
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }

    currentUtterance = new SpeechSynthesisUtterance(text);
    const languageSelect = document.getElementById('language-select');
    const languageCode = languageSelect ? languageSelect.value : 'en';
    const voices = speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith(languageCode)) || voices[0];

    if (voice) {
      currentUtterance.voice = voice;
    }

    currentUtterance.onend = () => {
      const stopBtn = document.getElementById('stopReadingBtn');
      const readBtn = document.getElementById('readAloudBtn');
      if (stopBtn) stopBtn.classList.add('d-none');
      if (readBtn) readBtn.classList.remove('d-none');
    };

    speechSynthesis.speak(currentUtterance);
    const readBtn = document.getElementById('readAloudBtn');
    const stopBtn = document.getElementById('stopReadingBtn');
    if (readBtn) readBtn.classList.add('d-none');
    if (stopBtn) stopBtn.classList.remove('d-none');
  }

  function stopReading() {
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
  }

  // Language Selection
  const languageSelect = document.getElementById('language-select');
  const savedLanguage = localStorage.getItem('wikiLanguage') || 'en';
  if (languageSelect) {
    languageSelect.value = savedLanguage;
    languageSelect.addEventListener('change', () => {
      localStorage.setItem('wikiLanguage', languageSelect.value);
    });
  }

  // DOM Elements
  const searchInput = document.getElementById('searchInput');
  const searchButton = document.getElementById('searchButton');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const errorAlert = document.getElementById('errorAlert');
  const resultsContainer = document.getElementById('resultsContainer');
  const resultTitle = document.getElementById('resultTitle');
  const resultContent = document.getElementById('resultContent');
  const fullArticleLink = document.getElementById('fullArticleLink');
  const imageContainer = document.getElementById('imageContainer');
  const searchHistoryList = document.getElementById('searchHistory');
  const historyContainer = document.getElementById('historyContainer');
  const shareCardBtn = document.getElementById('shareCardBtn');
  const downloadPdfBtn = document.getElementById('downloadPdfBtn');

  let searchHistory = JSON.parse(localStorage.getItem('wikiSearchHistory')) || [];

  // Display Search History
  function displaySearchHistory() {
  if (!searchHistoryList || !historyContainer) return;

  searchHistoryList.innerHTML = '';
  
  if (searchHistory.length === 0) {
    historyContainer.classList.add('d-none');
    return;
  }

  historyContainer.classList.remove('d-none');

  searchHistory.forEach((term, index) => {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    
    const termSpan = document.createElement('span');
    termSpan.className = 'search-history-item';
    termSpan.textContent = term;
    termSpan.addEventListener('click', () => {
      if (searchInput) searchInput.value = term;
      performSearch(term);
    });
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-sm btn-outline-danger';
    deleteBtn.innerHTML = '<i class="bi bi-x"></i>';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      searchHistory.splice(index, 1);
      localStorage.setItem('wikiSearchHistory', JSON.stringify(searchHistory));
      displaySearchHistory();
    });
    
    li.appendChild(termSpan);
    li.appendChild(deleteBtn);
    searchHistoryList.appendChild(li);
  });
}

function clearSearchHistory() {
  searchHistory = [];
  localStorage.removeItem('wikiSearchHistory');
  displaySearchHistory();
  
  // Optional: Show a temporary confirmation message
  const confirmation = document.createElement('div');
  confirmation.className = 'alert alert-success mt-3';
  confirmation.textContent = 'Search history cleared';
  historyContainer.appendChild(confirmation);
  
  setTimeout(() => confirmation.remove(), 3000);
}

  // Enhanced Wikipedia API Function with AI Summaries
  async function wikiFunction(searchTerm) {
    const language = languageSelect?.value || 'en';
    
    // First try Wikipedia's AI summary API
    try {
      const summaryUrl = `https://${language}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchTerm)}`;
      const summaryResponse = await fetch(summaryUrl);
      
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        
        if (summaryData.extract) {
          return {
            title: summaryData.title,
            content: summaryData.extract,
            url: summaryData.content_urls.desktop.page,
            image: summaryData.thumbnail?.source || null,
            language: language,
            isAISummary: true
          };
        }
      }
    } catch (error) {
      console.log("Using standard API", error);
    }
    
    // Fallback to standard Wikipedia API
    const url = `https://${language}.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=extracts|pageimages&exintro&explaintext&redirects=1&pithumbsize=300&titles=${encodeURIComponent(searchTerm)}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    const pages = data.query.pages;
    const pageId = Object.keys(pages)[0];

    if (pageId === "-1") throw new Error("No results found");

    return {
      title: pages[pageId].title,
      content: pages[pageId].extract,
      url: `https://${language}.wikipedia.org/wiki/${encodeURIComponent(pages[pageId].title)}`,
      image: pages[pageId].thumbnail?.source || null,
      language: language,
      isAISummary: false
    };
  }

  // PDF Generation Functions
  function generatePDF() {
    if (!window.jspdf) {
      alert("PDF library is still loading. Please try again in a moment.");
      return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const title = document.getElementById('resultTitle').textContent;
    const content = document.getElementById('resultContent').textContent;
    const image = document.querySelector('#imageContainer img');
    const url = document.getElementById('fullArticleLink').href;
    const date = new Date().toLocaleDateString();
    
    // Cover Page
    doc.setFontSize(24);
    doc.setTextColor(40, 40, 40);
    doc.text(title, 105, 80, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setTextColor(100);
    doc.text('Wikipedia Article', 105, 100, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Generated on ${date}`, 105, 120, { align: 'center' });
    
    doc.addPage();
    
    // Content Page
    doc.setFontSize(20);
    doc.text(title, 15, 20);
    
    // Add image if available
    if (image) {
      try {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        context.drawImage(image, 0, 0);
        
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        doc.addImage(imgData, 'JPEG', 15, 30, 50, 50 * (image.naturalHeight / image.naturalWidth));
      } catch (error) {
        console.error("Error processing image:", error);
      }
    }
    
    // Add content with better formatting
    doc.setFontSize(12);
    const lines = doc.splitTextToSize(content, 180);
    let yPosition = image ? 90 : 30;
    
    lines.forEach(line => {
      if (yPosition > 270) { // Check if we need a new page
        doc.addPage();
        yPosition = 20;
      }
      doc.text(line, 15, yPosition);
      yPosition += 7; // Line height
    });
    
    // Footer
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Source: ${url}`, 15, doc.internal.pageSize.height - 10);
    
    // Save PDF
    doc.save(`${title.substring(0, 30).replace(/[^a-z0-9]/gi, '_')}_Wikipedia.pdf`);
  }

  async function generateVisualPDF() {
    if (!window.html2canvas || !window.jspdf) {
      alert("PDF libraries are still loading. Please try again in a moment.");
      return;
    }
    
    const element = document.getElementById('resultsContainer');
    const { jsPDF } = window.jspdf;
    
    try {
      const canvas = await html2canvas(element);
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF();
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('wikipedia_article.pdf');
    } catch (error) {
      console.error("Error generating visual PDF:", error);
      alert("Failed to generate PDF. Trying alternative method...");
      generatePDF(); // Fallback to text-based PDF
    }
  }

  // SHARING FUNCTIONS
  function generateSummaryCard(result) {
    document.getElementById('cardTitle').textContent = result.title;
    document.getElementById('cardText').textContent = result.content.substring(0, 200) + '...';
    const cardImage = document.getElementById('cardImage');
    
    if (result.image) {
      cardImage.src = result.image;
      cardImage.style.display = 'block';
    } else {
      cardImage.style.display = 'none';
    }

    updateMetaTags(result);

    document.getElementById('copyCardBtn').onclick = () => copyCardToClipboard(result);
    document.getElementById('tweetCardBtn').href = generateTweetUrl(result);
    document.getElementById('facebookShareBtn').href = generateFacebookUrl(result);
    document.getElementById('whatsappShareBtn').href = generateWhatsAppUrl(result);
    
    new bootstrap.Modal(document.getElementById('shareCardModal')).show();
  }

  function copyCardToClipboard(result) {
    const cardHtml = `
      <div style="border: 1px solid #ddd; border-radius: 8px; max-width: 400px; font-family: Arial;">
        ${result.image ? `<img src="${result.image}" style="width:100%; max-height:200px; object-fit:cover; border-radius:8px 8px 0 0;">` : ''}
        <div style="padding: 15px;">
          <h3 style="margin-top:0;">${result.title}</h3>
          <p>${result.content.substring(0, 150)}...</p>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <small style="color:#777;">via Wikipedia Search</small>
            <a href="${result.url}" style="color:#0d6efd; text-decoration:none;">Read more →</a>
          </div>
        </div>
      </div>
    `;

    navigator.clipboard.writeText(cardHtml)
      .then(() => alert('Card copied to clipboard! Paste into any rich text editor.'))
      .catch(err => console.error('Failed to copy:', err));
  }

  function generateTweetUrl(result) {
    const text = `Check out this Wikipedia article about ${result.title}`;
    const url = result.url;
    const hashtags = "Wikipedia,Knowledge";
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=${hashtags}`;
  }

  function generateFacebookUrl(result) {
    const url = encodeURIComponent(result.url);
    return `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${encodeURIComponent(result.title)}`;
  }

  function generateWhatsAppUrl(result) {
    const text = `Check out this Wikipedia article about ${result.title}: ${result.url}`;
    if (isMobile()) {
      return `whatsapp://send?text=${encodeURIComponent(text)}`;
    } else {
      return `https://web.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    }
  }

  function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  function updateMetaTags(result) {
    const metaTitle = document.querySelector('meta[property="og:title"]');
    const metaDesc = document.querySelector('meta[property="og:description"]');
    const metaImage = document.querySelector('meta[property="og:image"]');
    const metaUrl = document.querySelector('meta[property="og:url"]');
    
    if (metaTitle) metaTitle.content = result.title;
    if (metaDesc) metaDesc.content = result.content.substring(0, 150) + '...';
    if (metaImage) metaImage.content = result.image || 'https://upload.wikimedia.org/wikipedia/en/thumb/8/80/Wikipedia-logo-v2.svg/1200px-Wikipedia-logo-v2.svg.png';
    if (metaUrl) metaUrl.content = result.url;
  }

  // Notes Functions
  function loadNote(title) {
    const notesSection = document.getElementById('notesSection');
    const noteField = document.getElementById('articleNote');
    const savedNote = localStorage.getItem(`wikiNote_${title}`);
    noteField.value = savedNote || '';
    if (notesSection) notesSection.classList.remove('d-none');
  }

  function saveNote(title) {
    const noteField = document.getElementById('articleNote');
    const note = noteField.value;
    localStorage.setItem(`wikiNote_${title}`, note);
    const noteSavedAlert = document.getElementById('noteSavedAlert');
    if (noteSavedAlert) {
      noteSavedAlert.classList.remove('d-none');
      setTimeout(() => noteSavedAlert.classList.add('d-none'), 2000);
    }
  }

  // Main Search Function with AI Summary Handling
  async function performSearch(term) {
    if (!term.trim()) return;

    try {
      if (loadingIndicator) loadingIndicator.classList.remove('d-none');
      if (resultsContainer) resultsContainer.classList.add('d-none');
      if (errorAlert) errorAlert.classList.add('d-none');

      const result = await wikiFunction(term);

      // Update results display
      if (resultTitle) {
        resultTitle.textContent = result.title;
        // Add AI summary badge if applicable
        if (result.isAISummary) {
          const summaryBadge = document.createElement('span');
          summaryBadge.className = 'badge bg-info ms-2';
          summaryBadge.textContent = 'AI Summary';
          resultTitle.appendChild(summaryBadge);
        }
      }

      if (resultContent) {
        resultContent.innerHTML = result.content
          ? result.content.split('\n').map(p => `<p>${p.trim()}</p>`).join('')
          : "<p>No extract available.</p>";
        
        // Add "Show full article" button for AI summaries
        // Add "Show full article" button for AI summaries
      if (result.isAISummary) {
        const showFullBtn = document.createElement('button');
        showFullBtn.className = 'btn btn-sm btn-outline-secondary mt-2';
        showFullBtn.innerHTML = '<i class="bi bi-arrows-angle-expand"></i> Show full article';
        
        showFullBtn.onclick = async () => {
          try {
            showFullBtn.disabled = true;
            showFullBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Loading...';
            
            // Fetch full article using standard API (not summary endpoint)
            const fullResult = await fetchFullArticle(term, result.language);
            
            resultContent.innerHTML = formatArticleContent(fullResult.content);
            showFullBtn.remove();
            
            // Re-attach event listeners that might have been removed
            attachContentEventListeners();
          } catch (error) {
            console.error("Error loading full article:", error);
            showFullBtn.disabled = false;
            showFullBtn.innerHTML = '<i class="bi bi-exclamation-triangle"></i> Try Again';
          }
        };
        
          resultContent.parentNode.insertBefore(showFullBtn, resultContent.nextSibling);
        }
              }

      if (fullArticleLink) fullArticleLink.href = result.url;

      // Display image if available
      if (imageContainer) {
        imageContainer.innerHTML = result.image 
          ? `<img src="${result.image}" alt="${result.title}" class="img-fluid rounded mb-3">` 
          : '<div class="text-muted">No image available</div>';
      }

      // Set up action buttons
      const readBtn = document.getElementById('readAloudBtn');
      const stopBtn = document.getElementById('stopReadingBtn');
      if (readBtn) readBtn.onclick = () => readAloud(`${result.title}. ${result.content}`);
      if (stopBtn) stopBtn.onclick = stopReading;

      // Set up share button
      if (shareCardBtn) shareCardBtn.onclick = () => generateSummaryCard(result);

      // Set up PDF download button
      if (downloadPdfBtn) {
        downloadPdfBtn.onclick = generatePDF;
        downloadPdfBtn.classList.remove('d-none');
      }


      // Add these after your existing utility functions (like readAloud, stopReading etc.)

        async function fetchFullArticle(term, language) {
          const url = `https://${language}.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=extracts&exintro=false&explaintext=true&redirects=1&titles=${encodeURIComponent(term)}`;
          
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

          const data = await response.json();
          const pages = data.query.pages;
          const pageId = Object.keys(pages)[0];

          if (pageId === "-1") throw new Error("No results found");

          return {
            title: pages[pageId].title,
            content: pages[pageId].extract,
            url: `https://${language}.wikipedia.org/wiki/${encodeURIComponent(pages[pageId].title)}`
          };
        }

        function formatArticleContent(content) {
          return content
            .split('\n\n')
            .map(section => {
              if (section.match(/^== .+ ==$/)) {
                return `<h3 class="wiki-section-title">${section.replace(/=/g, '')}</h3>`;
              } else if (section.match(/^=== .+ ===$/)) {
                return `<h4 class="wiki-subsection-title">${section.replace(/=/g, '')}</h4>`;
              } else {
                return `<p class="wiki-paragraph">${section.trim()}</p>`;
              }
            })
            .join('');
        }

        function attachContentEventListeners() {
          const readAloudBtn = document.getElementById('readAloudBtn');
          if (readAloudBtn) {
            const newContent = document.getElementById('resultContent').textContent;
            readAloudBtn.onclick = () => readAloud(newContent);
          }
        }


        // Add this with your other utility functions
        function clearSearchHistory() {
          searchHistory = [];
          localStorage.removeItem('wikiSearchHistory');
          displaySearchHistory(); // This will update the UI
        }

        // Add this to your event listeners section
        document.getElementById('clearHistoryBtn')?.addEventListener('click', () => {
          if (searchHistory.length > 0) {
            if (confirm('Are you sure you want to clear all search history?')) {
              clearSearchHistory();
            }
          } else {
            alert('Search history is already empty');
          }
        });


      // Load and set up notes
      loadNote(result.title);
      const saveNoteBtn = document.getElementById('saveNoteBtn');
      if (saveNoteBtn) saveNoteBtn.onclick = () => saveNote(result.title);

      if (resultsContainer) resultsContainer.classList.remove('d-none');

      // Update search history
      if (!searchHistory.includes(term)) {
        searchHistory.unshift(term);
        if (searchHistory.length > 5) searchHistory = searchHistory.slice(0, 5);
        localStorage.setItem('wikiSearchHistory', JSON.stringify(searchHistory));
        displaySearchHistory();
      }

    } catch (error) {
      if (errorAlert) {
        errorAlert.textContent = `Error: ${error.message}`;
        errorAlert.classList.remove('d-none');
      }
    } finally {
      if (loadingIndicator) loadingIndicator.classList.add('d-none');
    }
  }

  // Event Listeners
  if (searchButton && searchInput) {
    searchButton.addEventListener('click', () => {
      performSearch(searchInput.value.trim());
    });
  }

  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') performSearch(searchInput.value.trim());
    });
  }

  // Initialize
  displaySearchHistory();

  // Load voices for speech synthesis
  if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = () => {};
  }
});


// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registration successful');
      })
      .catch(err => {
        console.log('ServiceWorker registration failed: ', err);
      });
  });
}

// Install prompt handling
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  // Show install button (add this to your HTML)
  const installBtn = document.createElement('button');
  installBtn.id = 'installBtn';
  installBtn.className = 'btn btn-success position-fixed bottom-0 end-0 m-3';
  installBtn.innerHTML = '<i class="bi bi-download"></i> Install App';
  document.body.appendChild(installBtn);
  
  installBtn.addEventListener('click', () => {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(choiceResult => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted install');
      }
      deferredPrompt = null;
    });
  });
});
