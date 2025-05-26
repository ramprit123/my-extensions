// YouTube video bookmarking functionality
let currentVideo = "";
let currentTime = 0;
let currentVideoBookmarks = [];

// Only run on YouTube video pages
if (window.location.hostname === "www.youtube.com") {
  // Create category selector
  const createCategorySelector = () => {
    const select = document.createElement("select");
    select.className = "ytp-button bookmark-category-select";
    select.style.cssText = `
      background: #2a2a2a;
      color: white;
      border: 1px solid #3a3a3a;
      border-radius: 4px;
      padding: 4px;
      margin-right: 8px;
      cursor: pointer;
    `;

    // Load categories
    chrome.storage.sync.get(
      "categories",
      ({ categories = ["learning", "news", "stock", "other"] }) => {
        select.innerHTML = categories
          .map((cat) => `<option value="${cat.toLowerCase()}">${cat}</option>`)
          .join("");
      }
    );

    return select;
  };

  // Create bookmark button
  const createBookmarkButton = () => {
    const addBookmarkBtn = document.createElement("img");
    addBookmarkBtn.src = chrome.runtime.getURL("icons/icon48.svg");
    addBookmarkBtn.className = "ytp-button bookmark-btn";
    addBookmarkBtn.title = "Click to bookmark current timestamp";
    addBookmarkBtn.style.cssText = `
      width: 24px;
      height: 24px;
      cursor: pointer;
      margin-right: 8px;
    `;
    return addBookmarkBtn;
  };

  // Create notification element
  const createNotificationElement = () => {
    const notification = document.createElement("div");
    notification.id = "bookmark-notification";
    notification.textContent = "Bookmark Added!";
    notification.style.cssText = `
      position: absolute;
      bottom: 10px;
      left: 50%;
      transform: translateX(-50%);
      background-color: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.5s ease-in-out;
      pointer-events: none;
    `;
    document.body.appendChild(notification);
    return notification;
  };

  let bookmarkNotification = null;

  // Show notification
  const showNotification = (message) => {
    if (!bookmarkNotification) {
      bookmarkNotification = createNotificationElement();
    }
    bookmarkNotification.textContent = message;
    bookmarkNotification.style.opacity = 1;
    setTimeout(() => {
      bookmarkNotification.style.opacity = 0;
    }, 2000);
  };

  // Add controls to YouTube player
  const addBookmarkToYouTube = () => {
    const youtubeLeftControls =
      document.getElementsByClassName("ytp-left-controls")[0];
    if (
      youtubeLeftControls &&
      !youtubeLeftControls.querySelector(".bookmark-btn")
    ) {
      const categorySelect = createCategorySelector();
      const addBookmarkBtn = createBookmarkButton();

      youtubeLeftControls.appendChild(categorySelect);
      youtubeLeftControls.appendChild(addBookmarkBtn);

      // Add click event listener
      addBookmarkBtn.addEventListener("click", () =>
        saveBookmark(categorySelect.value)
      );
    }
  };

  // Handle video change
  const handleVideoChange = () => {
    const videoId = new URLSearchParams(window.location.search).get("v");
    if (videoId && videoId !== currentVideo) {
      currentVideo = videoId;
      chrome.storage.sync.get([currentVideo], (data) => {
        currentVideoBookmarks = data[currentVideo]
          ? JSON.parse(data[currentVideo])
          : [];
      });
    }
  };

  // Save bookmark
  const saveBookmark = (category) => {
    const video = document.getElementsByClassName("video-stream")[0];
    currentTime = video.currentTime;
    const newBookmark = {
      time: currentTime,
      desc: "Bookmark at " + getTime(currentTime),
      timestamp: new Date().getTime(),
      category: category,
    };

    chrome.storage.sync.get([currentVideo], (data) => {
      const bookmarks = data[currentVideo]
        ? JSON.parse(data[currentVideo])
        : [];
      chrome.storage.sync.set(
        {
          [currentVideo]: JSON.stringify(
            [...bookmarks, newBookmark].sort((a, b) => a.time - b.time)
          ),
        },
        () => {
          showNotification("Bookmark Added!");
        }
      );
    });
  };

  // Format time
  const getTime = (t) => {
    var date = new Date(0);
    date.setSeconds(t);
    return date.toISOString().substr(11, 8);
  };

  // Handle messages from popup
  chrome.runtime.onMessage.addListener((obj, sender, response) => {
    const { type, videoTime } = obj;
    if (type === "JUMP_TO_TIME") {
      const video = document.getElementsByClassName("video-stream")[0];
      video.currentTime = videoTime;
    }
  });

  // Initial setup
  handleVideoChange();

  // Add button when player is ready
  const checkForPlayer = setInterval(() => {
    if (document.getElementsByClassName("video-stream")[0]) {
      addBookmarkToYouTube();
      clearInterval(checkForPlayer);
    }
  }, 1000);

  // Watch for player changes (e.g., new video loaded)
  const observer = new MutationObserver(() => {
    if (document.getElementsByClassName("video-stream")[0]) {
      addBookmarkToYouTube();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}