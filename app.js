// Wikipedia API function
// Dark Mode Toggle
// Dark Mode Toggle
const darkModeToggle = document.getElementById('darkModeToggle');
const storedDarkMode = localStorage.getItem('darkMode') === 'true';

// Set initial state
if (storedDarkMode) {
  document.body.classList.add('dark-mode');
  darkModeToggle.checked = true;
}

// Toggle handler
darkModeToggle.addEventListener('change', (e) => {
  document.body.classList.toggle('dark-mode', e.target.checked);
  localStorage.setItem('darkMode', e.target.checked);
});

// Modify wikiFunction to use selected language
async function wikiFunction(searchTerm) {
  const language = document.getElementById('language-select').value;
  const url = `https://${language}.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=extracts|pageimages&exintro&explaintext&redirects=1&pithumbsize=300&titles=${encodeURIComponent(searchTerm)}`;
  
  const response = await fetch(url);
  const data = await response.json();
  const pages = data.query.pages;
  const pageId = Object.keys(pages)[0];
  
  if (pageId === "-1") throw new Error("No results found");
  
  return {
    title: pages[pageId].title,
    content: pages[pageId].extract,
    url: `https://${language}.wikipedia.org/wiki/${encodeURIComponent(pages[pageId].title)}`,
    image: pages[pageId].thumbnail?.source || null
  };

  // Rest of your existing wikiFunction code...

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const pages = data.query.pages;
    const pageId = Object.keys(pages)[0];
    
    if (pageId === "-1") {
        throw new Error("No results found");
    }
    
    return {
        title: pages[pageId].title,
        content: pages[pageId].extract,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(pages[pageId].title)}`
    };
}

// Add these variables at the top of your script
let speechSynthesis = window.speechSynthesis;
let currentUtterance = null;

// Add these functions to your code
function readAloud(text) {
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
  }

  currentUtterance = new SpeechSynthesisUtterance(text);
  currentUtterance.lang = document.getElementById('language-select').value;
  
  // Find a voice that matches the selected language
  const voices = speechSynthesis.getVoices();
  const languageCode = document.getElementById('language-select').value;
  const voice = voices.find(v => v.lang.startsWith(languageCode)) || voices[0];
  
  if (voice) {
    currentUtterance.voice = voice;
  }

  currentUtterance.onend = () => {
    document.getElementById('stopReadingBtn').classList.add('d-none');
    document.getElementById('readAloudBtn').classList.remove('d-none');
  };

  speechSynthesis.speak(currentUtterance);
  document.getElementById('readAloudBtn').classList.add('d-none');
  document.getElementById('stopReadingBtn').classList.remove('d-none');
}

function stopReading() {
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
  }
}

// Add this to your existing JavaScript
const languageSelect = document.getElementById('language-select');

// Load saved language
const savedLanguage = localStorage.getItem('wikiLanguage') || 'en';
languageSelect.value = savedLanguage;

// Save on change
languageSelect.addEventListener('change', () => {
  localStorage.setItem('wikiLanguage', languageSelect.value);
});

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const loadingIndicator = document.getElementById('loadingIndicator');
const errorAlert = document.getElementById('errorAlert');
const resultsContainer = document.getElementById('resultsContainer');
const resultTitle = document.getElementById('resultTitle');
const resultContent = document.getElementById('resultContent');
const fullArticleLink = document.getElementById('fullArticleLink');
const searchHistoryList = document.getElementById('searchHistory');
const historyContainer = document.getElementById('historyContainer');

// Search history array
let searchHistory = JSON.parse(localStorage.getItem('wikiSearchHistory')) || [];

// Display search history
function displaySearchHistory() {
    searchHistoryList.innerHTML = '';
    
    if (searchHistory.length === 0) {
        historyContainer.classList.add('d-none');
        return;
    }
    
    historyContainer.classList.remove('d-none');
    
    searchHistory.forEach(term => {
        const li = document.createElement('li');
        li.className = 'list-group-item search-history-item';
        li.textContent = term;
        li.addEventListener('click', () => {
            searchInput.value = term;
            performSearch(term);
        });
        searchHistoryList.appendChild(li);
    });
}

// Perform search
async function performSearch(term) {
    if (!term.trim()) return;
    
    try {
        // Show loading, hide results and error
    resultTitle.textContent = result.title;
    resultContent.textContent = result.content || "No extract available.";
    fullArticleLink.href = result.url;
    
    // Display image if available
    const imageContainer = document.getElementById('imageContainer');
    imageContainer.innerHTML = result.image 
      ? `<img src="${result.image}" alt="${result.title}" class="img-fluid rounded mb-3">` 
      : '<div class="text-muted">No image available</div>';
    
    // Set up read aloud button
    document.getElementById('readAloudBtn').onclick = () => readAloud(`${result.title}. ${result.content}`);
    document.getElementById('stopReadingBtn').onclick = stopReading;
        // Perform search
        const result = await wikiFunction(term);
        
        // Update UI with results
        resultTitle.textContent = result.title;
        resultContent.textContent = result.content || "No extract available.";
        fullArticleLink.href = result.url;
        resultsContainer.classList.remove('d-none');
        
        // Add to search history if not already there
        if (!searchHistory.includes(term)) {
            searchHistory.unshift(term);
            // Keep only last 5 searches
            if (searchHistory.length > 5) {
                searchHistory = searchHistory.slice(0, 5);
            }
            localStorage.setItem('wikiSearchHistory', JSON.stringify(searchHistory));
            displaySearchHistory();
        }
    } catch (error) {
        errorAlert.textContent = `Error: ${error.message}`;
        errorAlert.classList.remove('d-none');
    } finally {
        loadingIndicator.classList.add('d-none');
    }
}

// Event listeners
searchButton.addEventListener('click', () => {
    performSearch(searchInput.value.trim());
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        performSearch(searchInput.value.trim());
    }
});

// Initialize
displaySearchHistory();
