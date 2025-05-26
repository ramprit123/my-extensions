document.addEventListener('DOMContentLoaded', async function() {
  const bookmarksElement = document.getElementById('bookmarks');
  const noBookmarksElement = document.getElementById('no-bookmarks');

  // Get current tab
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];

  if (activeTab.url && activeTab.url.includes('youtube.com/watch')) {
    const queryParameters = activeTab.url.split('?')[1];
    const urlParameters = new URLSearchParams(queryParameters);
    const currentVideo = urlParameters.get('v');

    if (currentVideo) {
      // Get bookmarks for current video
      chrome.storage.sync.get([currentVideo], (data) => {
        const currentVideoBookmarks = data[currentVideo] ? JSON.parse(data[currentVideo]) : [];

        if (currentVideoBookmarks.length > 0) {
          noBookmarksElement.classList.add('hidden');
          displayBookmarks(currentVideoBookmarks, currentVideo);
        } else {
          noBookmarksElement.classList.remove('hidden');
          bookmarksElement.innerHTML = '';
        }
      });
    }
  } else {
    noBookmarksElement.classList.remove('hidden');
    noBookmarksElement.innerHTML = '<p>Not a YouTube video page!</p>';
  }

  function displayBookmarks(bookmarks, videoId) {
    bookmarksElement.innerHTML = bookmarks.map((bookmark) => {
      return `
        <div class="bookmark-item" data-time="${bookmark.time}">
          <span class="bookmark-time">${getTime(bookmark.time)}</span>
          <span class="bookmark-title">${bookmark.desc}</span>
          <button class="bookmark-delete" data-timestamp="${bookmark.timestamp}">
            ×
          </button>
        </div>
      `;
    }).join('');

    // Add click handlers
    document.querySelectorAll('.bookmark-item').forEach((bookmark) => {
      bookmark.addEventListener('click', () => {
        const time = bookmark.getAttribute('data-time');
        chrome.tabs.sendMessage(activeTab.id, {
          type: 'JUMP_TO_TIME',
          videoTime: time
        });
      });
    });

    document.querySelectorAll('.bookmark-delete').forEach((button) => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const timestamp = button.getAttribute('data-timestamp');
        const newBookmarks = bookmarks.filter((b) => b.timestamp.toString() !== timestamp);

        chrome.storage.sync.set({
          [videoId]: JSON.stringify(newBookmarks)
        }, () => {
          displayBookmarks(newBookmarks, videoId);
          if (newBookmarks.length === 0) {
            noBookmarksElement.classList.remove('hidden');
          }
        });
      });
    });
  }

  function getTime(t) {
    var date = new Date(0);
    date.setSeconds(t);
    return date.toISOString().substr(11, 8);
  }
});