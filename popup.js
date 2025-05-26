document.addEventListener('DOMContentLoaded', async function() {
  const bookmarksElement = document.getElementById('bookmarks');
  const noBookmarksElement = document.getElementById('no-bookmarks');
  const categorySelect = document.getElementById("bookmarkCategory");
  const addCategoryBtn = document.getElementById("addCategory");
  const categoryModal = document.getElementById("categoryModal");
  const newCategoryInput = document.getElementById("newCategoryName");
  const saveCategoryBtn = document.getElementById("saveCategoryBtn");
  const cancelCategoryBtn = document.getElementById("cancelCategoryBtn");
  const generateNotesBtn = document.getElementById("generateNotes");
  const aiNotesSection = document.getElementById("aiNotes");
  const notesContent = aiNotesSection.querySelector(".notes-content");

  let currentVideoId = "";
  let currentVideoBookmarks = [];

  // Get current tab
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];

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
  } else {
    noBookmarksElement.classList.remove("hidden");
    noBookmarksElement.innerHTML = "<p>Not a YouTube video page!</p>";
  }

  function displayBookmarks(bookmarks) {
    const selectedCategory = categorySelect.value;
    const filteredBookmarks =
      selectedCategory === "all"
        ? bookmarks
        : bookmarks.filter((b) => b.category === selectedCategory);

    bookmarksElement.innerHTML = filteredBookmarks
      .map((bookmark) => {
        return `
        <div class="bookmark-item" data-time="${bookmark.time}">
          <span class="bookmark-time">${getTime(bookmark.time)}</span>
          <span class="bookmark-title">${bookmark.desc}</span>
          <span class="bookmark-category">${bookmark.category || "other"}</span>
          <button class="bookmark-delete" data-timestamp="${
            bookmark.timestamp
          }">
            ×
          </button>
        </div>
      `;
      })
      .join("");

    // Add click handlers
    document.querySelectorAll(".bookmark-item").forEach((bookmark) => {
      bookmark.addEventListener("click", () => {
        const time = bookmark.getAttribute("data-time");
        chrome.tabs.sendMessage(activeTab.id, {
          type: "JUMP_TO_TIME",
          videoTime: time,
        });
      });
    });

    document.querySelectorAll(".bookmark-delete").forEach((button) => {
      button.addEventListener("click", (e) => {
        e.stopPropagation();
        const timestamp = button.getAttribute("data-timestamp");
        const newBookmarks = bookmarks.filter(
          (b) => b.timestamp.toString() !== timestamp
        );

        chrome.storage.sync.set(
          {
            [currentVideoId]: JSON.stringify(newBookmarks),
          },
          () => {
            currentVideoBookmarks = newBookmarks;
            displayBookmarks(newBookmarks);
            if (newBookmarks.length === 0) {
              noBookmarksElement.classList.remove("hidden");
              aiNotesSection.classList.add("hidden");
            }
          }
        );
      });
    });
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
  categorySelect.addEventListener("change", () =>
    displayBookmarks(currentVideoBookmarks)
  );
  generateNotesBtn.addEventListener("click", generateNotes);

  // Initialize categories
  loadCategories();
});