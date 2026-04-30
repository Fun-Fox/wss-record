# Changelog - WSS Recorder

## [1.0.0] - 2026-04-29

### 🎉 Initial Release

#### Added
- **WebSocket Message Recording**
  - Real-time capture of all WebSocket send/receive messages
  - Connection filtering and selection
  - Visual recording status indicators
  - Real-time message counter

- **Behavior Management System**
  - Save recorded sequences as named behaviors
  - Edit individual messages (text and binary)
  - Delete unwanted messages
  - Clear entire behavior
  - Import/export behaviors as JSON

- **Advanced Replay Features**
  - Configurable repeat count (1-100 times)
  - Adjustable replay interval (0-3600 seconds, supports decimals)
  - Automatic time estimation with real-time updates
  - Progress tracking during replay
  - Detailed status panel showing configuration

- **Message Editing Capabilities**
  - Text message editor with validation
  - Binary message hex editor
  - Format validation for binary data
  - Save/cancel operations

- **Multi-format Export**
  - Node.js script generation (ws library)
  - Python script generation (websockets library)
  - Complete connection and message logic included

- **User Interface**
  - Dark-themed DevTools panel (WSS Panel)
  - Clean popup interface (WSS Recorder)
  - Connection list with status indicators
  - Message timeline view
  - Behavior detail modal
  - Replay configuration panel

#### Technical Features
- Chrome Extension Manifest V3 architecture
- Service worker background processing
- Content script injection for WebSocket interception
- Local storage persistence using chrome.storage.local
- Non-intrusive WebSocket constructor override
- Binary message support with ArrayBuffer handling
- Real-time communication between extension components

#### Documentation
- Comprehensive README.md with full documentation
- FEATURES.md with detailed feature list (Chinese)
- QUICKSTART.md with step-by-step guide
- CHANGELOG.md (this file)

### Changed
- Renamed extension from "设备群控 WebSocket 录制回放" to **"WSS Recorder"**
- Renamed DevTools panel from "设备群控 WSS 录制回放" to **"WSS Panel"**
- Updated all UI text to English for international accessibility
- Simplified naming throughout the codebase

### Fixed
- Message deletion UI refresh issue (corrected function name from `showBehaviorDetail` to `viewBehaviorDetail`)
- Ensured proper state synchronization after message edits and deletions

### Architecture
```
wss-proxy/
├── manifest.json              # Extension configuration
├── src/
│   ├── background/
│   │   └── service-worker.js  # Background logic & storage
│   ├── content/
│   │   ├── content-script.js  # Injection bridge
│   │   └── injected-script.js # WebSocket interceptor
│   ├── devtools/
│   │   ├── devtools.html      # Entry point
│   │   ├── devtools.js        # Panel registration
│   │   ├── panel.html         # Main UI structure
│   │   ├── panel.css          # Styling (dark theme)
│   │   └── panel.js           # All panel logic
│   ├── popup/
│   │   ├── popup.html         # Popup UI
│   │   └── popup.js           # Popup logic
│   └── icons/                 # Extension icons (16, 48, 128px)
├── templates/
│   ├── node-ws-script.js      # Node.js export template
│   └── python-websocket-script.py  # Python export template
├── generate-icons.js          # Icon generation utility
├── README.md                  # Main documentation
├── FEATURES.md                # Feature overview (Chinese)
├── QUICKSTART.md              # Quick start guide
└── CHANGELOG.md               # Version history
```

### Permissions Required
- `storage`: Persist behaviors and settings
- `webRequest`: Monitor WebSocket connections
- `activeTab`: Access current tab for script injection
- `tabs`: Manage browser tabs
- `scripting`: Inject content scripts
- `<all_urls>`: Intercept WebSocket on any website

### Use Cases
- Device control automation and testing
- WebSocket API testing and validation
- Debugging and traffic analysis
- Documentation and knowledge sharing
- Load testing with configurable intervals
- Regression testing with saved behaviors

### Performance Notes
- Minimal overhead when not recording
- Efficient message storage and retrieval
- Optimized UI rendering for large message sets
- Smart time estimation algorithm (~50ms per message assumption)

### Browser Compatibility
- Chrome 88+ (Manifest V3 support required)
- Edge 88+ (Chromium-based)
- Other Chromium-based browsers with Manifest V3 support

---

## Future Roadmap

### Planned Features (v1.1.0)
- [ ] Search and filter messages within behaviors
- [ ] Message tagging and categorization
- [ ] Batch operations on multiple messages
- [ ] Replay speed control (fast forward/slow motion)
- [ ] Conditional replay based on responses
- [ ] Variable substitution in messages
- [ ] Environment-specific configurations

### Under Consideration
- [ ] Cloud sync for behaviors
- [ ] Team collaboration features
- [ ] Advanced analytics and statistics
- [ ] Custom script templates
- [ ] Integration with testing frameworks
- [ ] Automated test case generation
- [ ] Performance profiling tools

---

## Credits

Built with ❤️ for developers working with WebSocket applications.

Special thanks to:
- Chrome Extensions team for Manifest V3
- WebSocket community for standards and best practices
- All beta testers who provided valuable feedback

---

## License

MIT License - See LICENSE file for details
