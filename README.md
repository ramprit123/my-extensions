# Chrome Extension Starter

A basic Chrome extension template to help you get started with extension development.

## Features

- Popup interface with HTML, CSS, and JavaScript
- Background service worker
- Basic extension structure following Manifest V3

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory

## Development

### Project Structure

```
├── manifest.json       # Extension manifest and configuration
├── popup.html         # Popup interface HTML
├── popup.css          # Popup styles
├── popup.js           # Popup functionality
├── background.js      # Background service worker
└── icons/             # Extension icons (create this directory)
```

### Adding Icons

Create an `icons` directory and add your extension icons with the following sizes:
- icon16.png (16x16)
- icon48.png (48x48)
- icon128.png (128x128)

### Making Changes

1. Edit the files as needed
2. Go to `chrome://extensions/`
3. Click the refresh icon on your extension card
4. Test your changes

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT