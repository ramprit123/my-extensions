document.addEventListener('DOMContentLoaded', async function() {
  const bookmarksElement = document.getElementById('bookmarks');
  const allBookmarksElement = document.getElementById("allBookmarks");
  const noBookmarksElement = document.getElementById("no-bookmarks");
  const categorySelect = document.getElementById("bookmarkCategory");
  const addCategoryBtn = document.getElementById("addCategory");
  const categoryModal = document.getElementById("categoryModal");
  const newCategoryInput = document.getElementById("newCategoryName");
  const saveCategoryBtn = document.getElementById("saveCategoryBtn");
  const cancelCategoryBtn = document.getElementById("cancelCategoryBtn");
  const generateNotesBtn = document.getElementById("generateNotes");
  const aiNotesSection = document.getElementById("aiNotes");
  const notesContent = aiNotesSection.querySelector(".notes-content");
  const searchInput = document.getElementById("searchBookmarks");
  const settingsBtn = document.getElementById("settingsBtn");
  const apiKeySetup = document.getElementById("apiKeySetup");
  const apiKeyInput = document.getElementById("apiKey");
  const saveApiKeyBtn = document.getElementById("saveApiKey");

  let currentVideoId = "";
  let currentVideoBookmarks = [];
  let allBookmarks = {};

  // Load API Key
  async function loadApiKey() {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "GET_API_KEY" }, resolve);
    });
    if (!response.apiKey) {
      apiKeySetup.classList.remove("hidden");
    } else {
      apiKeyInput.value = response.apiKey;
    }
  }

  // Save API Key
  async function saveApiKey() {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
      await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "SET_API_KEY", apiKey }, resolve);
      });
      apiKeySetup.classList.add("hidden");
    }
  }

  // Load categories
  async function loadCategories() {
    const { categories = ["learning", "news", "stock", "other"] } =
      await chrome.storage.sync.get("categories");
    categorySelect.innerHTML =
      '<option value="all">All Bookmarks</option>' +
      categories
        .map((cat) => `<option value="${cat.toLowerCase()}">${cat}</option>`)
        .join("");
  }

  // Save new category
  async function saveCategory() {
    const newCategory = newCategoryInput.value.trim();
    if (newCategory) {
      const { categories = [] } = await chrome.storage.sync.get("categories");
      if (!categories.includes(newCategory)) {
        categories.push(newCategory);
        await chrome.storage.sync.set({ categories });
        await loadCategories();
        categoryModal.classList.add("hidden");
        newCategoryInput.value = "";
      }
    }
  }

  // Load all bookmarks
  async function loadAllBookmarks() {
    const data = await chrome.storage.sync.get(null);
    allBookmarks = {};

    for (const key in data) {
      if (key !== "categories" && key !== "apiKey") {
        try {
          const bookmarks = JSON.parse(data[key]);
          if (Array.isArray(bookmarks) && bookmarks.length > 0) {
            allBookmarks[key] = bookmarks;
          }
        } catch (e) {
          console.error("Error parsing bookmarks:", e);
        }
      }
    }

    displayAllBookmarks();
  }

  // Display all bookmarks
  function displayAllBookmarks() {
    const selectedCategory = categorySelect.value;
    const searchTerm = searchInput.value.toLowerCase();
    let html = "";

    for (const videoId in allBookmarks) {
      const bookmarks = allBookmarks[videoId];
      const filteredBookmarks = bookmarks.filter((bookmark) => {
        const matchesCategory =
          selectedCategory === "all" || bookmark.category === selectedCategory;
        const matchesSearch = bookmark.desc.toLowerCase().includes(searchTerm);
        return matchesCategory && matchesSearch;
      });

      if (filteredBookmarks.length > 0) {
        html += `
          <div class="video-section">
            <div class="video-header">
              <img class="video-thumbnail" src="https://img.youtube.com/vi/${videoId}/mqdefault.jpg" alt="Video thumbnail">
              <div class="video-title">${
                filteredBookmarks[0].videoTitle || "YouTube Video"
              }</div>
            </div>
            ${filteredBookmarks
              .map(
                (bookmark) => `
              <div class="bookmark-item" data-video-id="${videoId}" data-time="${
                  bookmark.time
                }">
                <span class="bookmark-time">${getTime(bookmark.time)}</span>
                <span class="bookmark-title">${bookmark.desc}</span>
                <span class="bookmark-category">${
                  bookmark.category || "other"
                }</span>
                <button class="bookmark-delete" data-video-id="${videoId}" data-timestamp="${
                  bookmark.timestamp
                }">
                  ×
                </button>
              </div>
            `
              )
              .join("")}
          </div>
        `;
      }
    }

    allBookmarksElement.innerHTML = html || "<p>No bookmarks found</p>";

    // Add click handlers
    document.querySelectorAll(".bookmark-item").forEach((bookmark) => {
      bookmark.addEventListener("click", () => {
        const videoId = bookmark.getAttribute("data-video-id");
        const time = bookmark.getAttribute("data-time");
        chrome.tabs.create({
          url: `https://youtube.com/watch?v=${videoId}&t=${time}s`,
        });
      });
    });

    document.querySelectorAll(".bookmark-delete").forEach((button) => {
      button.addEventListener("click", async (e) => {
        e.stopPropagation();
        const videoId = button.getAttribute("data-video-id");
        const timestamp = button.getAttribute("data-timestamp");
        const bookmarks = allBookmarks[videoId];
        const newBookmarks = bookmarks.filter(
          (b) => b.timestamp.toString() !== timestamp
        );

        await chrome.storage.sync.set({
          [videoId]: JSON.stringify(newBookmarks),
        });

        if (newBookmarks.length === 0) {
          delete allBookmarks[videoId];
        } else {
          allBookmarks[videoId] = newBookmarks;
        }

        displayAllBookmarks();
      });
    });
  }

  // Generate AI notes
  async function generateNotes() {
    try {
      // Get API key
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "GET_API_KEY" }, resolve);
      });

      if (!response.apiKey) {
        notesContent.innerHTML =
          "Please set your OpenRouter API key in the extension settings.";
        aiNotesSection.classList.remove("hidden");
        apiKeySetup.classList.remove("hidden");
        return;
      }

      generateNotesBtn.disabled = true;
      generateNotesBtn.textContent = "Generating...";

      const apiResponse = await fetch(
        "https://api.openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${response.apiKey}`,
          },
          body: JSON.stringify({
            model: "anthropic/claude-2",
            messages: [
              {
                role: "user",
                content: `Analyze these YouTube video bookmarks and generate concise, insightful notes:\n${currentVideoBookmarks
                  .map((b) => `${b.desc} (${getTime(b.time)})`)
                  .join("\n")}`,
              },
            ],
          }),
        }
      );

      const data = await apiResponse.json();
      if (data.choices && data.choices[0]) {
        notesContent.innerHTML = data.choices[0].message.content.replace(
          /\n/g,
          "<br>"
        );
        aiNotesSection.classList.remove("hidden");
      }
    } catch (error) {
      notesContent.innerHTML =
        "Failed to generate notes. Please check your API key and try again.";
      aiNotesSection.classList.remove("hidden");
    } finally {
      generateNotesBtn.disabled = false;
      generateNotesBtn.textContent = "Generate AI Notes";
    }
  }

  function getTime(t) {
    var date = new Date(0);
    date.setSeconds(t);
    return date.toISOString().substr(11, 8);
  }

  // Event Listeners
  addCategoryBtn.addEventListener("click", () =>
    categoryModal.classList.remove("hidden")
  );
  saveCategoryBtn.addEventListener("click", saveCategory);
  cancelCategoryBtn.addEventListener("click", () => {
    categoryModal.classList.add("hidden");
    newCategoryInput.value = "";
  });
  categorySelect.addEventListener("change", () => {
    displayAllBookmarks();
    if (currentVideoBookmarks.length > 0) {
      displayBookmarks(currentVideoBookmarks);
    }
  });
  generateNotesBtn.addEventListener("click", generateNotes);
  searchInput.addEventListener("input", displayAllBookmarks);
  settingsBtn.addEventListener("click", () => {
    apiKeySetup.classList.toggle("hidden");
  });
  saveApiKeyBtn.addEventListener("click", saveApiKey);

  // Initialize
  loadCategories();
  loadApiKey();
  loadAllBookmarks();

  // Get current tab and handle current video bookmarks if on YouTube
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];

  if (activeTab.url && activeTab.url.includes("youtube.com/watch")) {
    const queryParameters = activeTab.url.split("?")[1];
    const urlParameters = new URLSearchParams(queryParameters);
    currentVideoId = urlParameters.get("v");

    if (currentVideoId) {
      // Get bookmarks for current video
      chrome.storage.sync.get([currentVideoId], (data) => {
        currentVideoBookmarks = data[currentVideoId]
          ? JSON.parse(data[currentVideoId])
          : [];

        if (currentVideoBookmarks.length > 0) {
          noBookmarksElement.classList.add("hidden");
          displayBookmarks(currentVideoBookmarks);
        } else {
          noBookmarksElement.classList.remove("hidden");
          bookmarksElement.innerHTML = "";
        }
      });
    }
  }
});