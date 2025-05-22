document.addEventListener('DOMContentLoaded', () => {
  // ---- All your code here ----

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

  let searchHistory = JSON.parse(localStorage.getItem('wikiSearchHistory')) || [];

  function displaySearchHistory() {
    if (!searchHistoryList || !historyContainer) return;

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
        if (searchInput) searchInput.value = term;
        performSearch(term);
      });
      searchHistoryList.appendChild(li);
    });
  }

  async function wikiFunction(searchTerm) {
    const language = languageSelect?.value || 'en';
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
      image: pages[pageId].thumbnail?.source || null
    };
  }

  async function performSearch(term) {
    if (!term.trim()) return;

    try {
      loadingIndicator?.classList.remove('d-none');
      resultsContainer?.classList.add('d-none');
      errorAlert?.classList.add('d-none');

      const result = await wikiFunction(term);

      if (resultTitle) resultTitle.textContent = result.title;
      if (resultContent) resultContent.textContent = result.content || "No extract available.";
      if (fullArticleLink) fullArticleLink.href = result.url;

      if (imageContainer) {
        imageContainer.innerHTML = result.image
          ? `<img src="${result.image}" alt="${result.title}" class="img-fluid rounded mb-3">`
          : '<div class="text-muted">No image available</div>';
      }

      const readBtn = document.getElementById('readAloudBtn');
      const stopBtn = document.getElementById('stopReadingBtn');

      if (readBtn) readBtn.onclick = () => readAloud(`${result.title}. ${result.content}`);
      if (stopBtn) stopBtn.onclick = stopReading;

      resultsContainer?.classList.remove('d-none');

      if (!searchHistory.includes(term)) {
        searchHistory.unshift(term);
        if (searchHistory.length > 5) searchHistory = searchHistory.slice(0, 5);
        localStorage.setItem('wikiSearchHistory', JSON.stringify(searchHistory));
        displaySearchHistory();
      }


        function loadNote(title) {
          const notesSection = document.getElementById('notesSection');
          const noteField = document.getElementById('articleNote');
          const savedNote = localStorage.getItem(`wikiNote_${title}`);
          
          noteField.value = savedNote || '';
          notesSection.classList.remove('d-none');
        }

        function saveNote(title) {
          const noteField = document.getElementById('articleNote');
          const note = noteField.value;
          localStorage.setItem(`wikiNote_${title}`, note);

          const noteSavedAlert = document.getElementById('noteSavedAlert');
          noteSavedAlert.classList.remove('d-none');
          setTimeout(() => noteSavedAlert.classList.add('d-none'), 2000);
        }

        loadNote(result.title);

        document.getElementById('saveNoteBtn').onclick = () => saveNote(result.title);


    } catch (error) {
      if (errorAlert) {
        errorAlert.textContent = `Error: ${error.message}`;
        errorAlert.classList.remove('d-none');
      }
    } finally {
      loadingIndicator?.classList.add('d-none');
    }
  }

  if (searchButton) {
    searchButton.addEventListener('click', () => {
      performSearch(searchInput?.value.trim());
    });
  }

  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') performSearch(searchInput.value.trim());
    });
  }

  displaySearchHistory();

  // Load voices for speech synthesis
  if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = () => {};
  }
});
