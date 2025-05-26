document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyInput = document.getElementById('apiKey');
  const saveButton = document.getElementById('saveSettings');
  const statusDiv = document.getElementById('status');

  // Load existing API key
  chrome.runtime.sendMessage({ type: 'GET_API_KEY' }, (response) => {
    if (response.apiKey) {
      apiKeyInput.value = response.apiKey;
    }
  });

  // Save API key
  saveButton.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
      showStatus('Please enter an API key', 'error');
      return;
    }

    chrome.runtime.sendMessage(
      { type: 'SET_API_KEY', apiKey },
      (response) => {
        if (response.success) {
          showStatus('API key saved successfully!', 'success');
        } else {
          showStatus('Failed to save API key', 'error');
        }
      }
    );
  });

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    
    // Hide status after 3 seconds
    setTimeout(() => {
      statusDiv.className = 'status';
    }, 3000);
  }
});