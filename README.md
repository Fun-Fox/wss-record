# WSS Recorder

A Chrome DevTools extension for recording and replaying WebSocket (WSS) messages, designed for device control scenarios.

## Features

### 🎯 Core Functionality

- **WebSocket Message Recording**: Capture all WebSocket send/receive messages in real-time
- **Connection Filtering**: Select specific WebSocket connections to record
- **Behavior Management**: Save recorded message sequences as reusable behaviors
- **Message Replay**: Replay saved behaviors with configurable repeat count and interval
- **Binary Message Support**: Full support for binary WebSocket messages with hex editing
- **Multi-format Export**: Export behaviors as Node.js or Python scripts

### 🔧 Advanced Features

#### Recording Controls
- Start/stop recording at any time
- Filter by connection ID
- Real-time message counter
- Connection status indicators

#### Behavior Management
- Create named behavior sequences
- Edit individual messages (text and binary)
- Delete unwanted messages
- Clear entire behavior
- Import/export behaviors as JSON

#### Replay Configuration
- **Repeat Count**: Set how many times to replay (1-100 times)
- **Replay Interval**: Configure wait time between replays (0-3600 seconds)
- **Time Estimation**: Automatic calculation of total replay duration
- Real-time estimate updates as you change settings

#### Message Editing
- Text message editor with validation
- Binary message hex editor
- Format validation for binary data
- Undo/redo support through save/cancel

### 📊 UI Components

#### DevTools Panel (WSS Panel)
- Clean, dark-themed interface
- Connection list with status indicators
- Message timeline view
- Behavior detail modal
- Replay status panel

#### Popup Interface
- Quick access to extension status
- Recording state indicator
- Instructions for accessing DevTools panel

## Installation

### From Source

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (top right corner)
4. Click "Load unpacked"
5. Select the `wss-proxy` directory
6. The extension icon should appear in your toolbar

### Verify Installation

1. Open any webpage with WebSocket connections
2. Press `F12` to open DevTools
3. Look for the **"WSS Panel"** tab
4. Click to activate the panel

## Usage Guide

### Recording Messages

1. **Open DevTools**: Press `F12` on any webpage
2. **Switch to WSS Panel**: Click the "WSS Panel" tab
3. **Select Connection** (optional): Choose a specific WebSocket connection from the list
4. **Start Recording**: Click the red "Record" button
5. **Interact with Page**: Perform actions that trigger WebSocket messages
6. **Stop Recording**: Click the button again to stop

### Creating Behaviors

1. After recording, click "Save Behavior"
2. Enter a descriptive name for the behavior
3. Review captured messages in the detail modal
4. Edit or delete messages as needed
5. Click "Save" to store the behavior

### Replaying Behaviors

1. Navigate to the "Behaviors" tab
2. Find your saved behavior
3. Click "Replay" button
4. Configure replay settings:
   - **Repeat Count**: Number of times to replay (default: 1)
   - **Replay Interval**: Wait time between replays in seconds (default: 0)
   - **Estimated Time**: Automatically calculated based on settings
5. Click "Start Replay"
6. Monitor progress in the status panel

### Exporting Scripts

1. Go to "Behaviors" tab
2. Click "Export" on desired behavior
3. Choose format:
   - **Node.js**: JavaScript script using `ws` library
   - **Python**: Python script using `websockets` library
4. Download and use the generated script

### Managing Connections

- **View All Connections**: See all active WebSocket connections
- **Filter by URL**: Connections are grouped by origin URL
- **Connection Status**: Visual indicators show active/inactive states
- **Recording Indicator**: Active recording connections are highlighted

## Architecture

### Project Structure

```
wss-proxy/
├── manifest.json              # Extension manifest
├── src/
│   ├── background/
│   │   └── service-worker.js  # Background service worker
│   ├── content/
│   │   ├── content-script.js  # Content script injector
│   │   └── injected-script.js # WebSocket interceptor
│   ├── devtools/
│   │   ├── devtools.html      # DevTools entry point
│   │   ├── devtools.js        # Panel registration
│   │   ├── panel.html         # Main panel UI
│   │   ├── panel.css          # Panel styles
│   │   └── panel.js           # Panel logic
│   ├── popup/
│   │   ├── popup.html         # Popup UI
│   │   └── popup.js           # Popup logic
│   └── icons/                 # Extension icons
├── templates/
│   ├── node-ws-script.js      # Node.js export template
│   └── python-websocket-script.py  # Python export template
└── generate-icons.js          # Icon generation script
```

### Component Responsibilities

#### Service Worker (`service-worker.js`)
- Manages WebSocket connection tracking
- Handles message storage and retrieval
- Processes behavior save/load operations
- Coordinates communication between components

#### Injected Script (`injected-script.js`)
- Intercepts WebSocket constructor
- Captures send/receive events
- Filters messages based on recording state
- Forwards data to content script

#### Content Script (`content-script.js`)
- Injects interceptor into page context
- Bridges page and extension contexts
- Handles message routing

#### DevTools Panel (`panel.js`)
- Provides user interface
- Manages recording controls
- Displays connections and messages
- Handles behavior management
- Controls replay execution

## Technical Details

### Message Format

Messages are stored with the following structure:

```javascript
{
  id: number,              // Unique message ID
  type: 'send' | 'receive', // Message direction
  data: string | ArrayBuffer, // Message content
  timestamp: number,       // Unix timestamp
  isBinary: boolean        // Whether message is binary
}
```

### Storage

All data is persisted using `chrome.storage.local`:
- **connections**: Active WebSocket connections
- **messages**: Recorded message arrays
- **behaviors**: Saved behavior configurations
- **recordingState**: Current recording status

### Replay Algorithm

1. Load behavior configuration
2. Establish new WebSocket connection
3. For each repeat iteration:
   - Send/receive messages in sequence
   - Wait for configured interval (except after last iteration)
   - Update progress display
4. Report completion status

### Time Estimation Formula

```
Total Time = (Message Count × 50ms × Repeat Count) + (Interval × (Repeat Count - 1))
```

- Assumes ~50ms per message processing
- Interval only applies between repeats (not after final repeat)
- Auto-formats to ms/seconds/minutes/hours based on duration

## Development

### Prerequisites

- Node.js (for icon generation)
- Chrome browser
- Basic understanding of Chrome Extensions

### Generating Icons

```bash
node generate-icons.js
```

This creates PNG icons in multiple sizes from the SVG source.

### Debugging

1. **Service Worker**: 
   - Go to `chrome://extensions/`
   - Click "Inspect views: service worker"
   
2. **DevTools Panel**:
   - Right-click the panel
   - Select "Inspect"

3. **Content Script**:
   - Open page DevTools
   - Check Console tab

## Permissions

The extension requires the following permissions:

- **storage**: Save behaviors and settings
- **webRequest**: Monitor WebSocket connections
- **activeTab**: Access current tab for injection
- **tabs**: Manage browser tabs
- **scripting**: Inject content scripts
- **<all_urls>**: Intercept WebSocket on any website

## Use Cases

### Device Control Automation
- Record device control commands
- Replay sequences for testing
- Automate repetitive control tasks

### API Testing
- Capture WebSocket API interactions
- Replay for regression testing
- Validate message formats

### Debugging
- Inspect WebSocket traffic
- Analyze message patterns
- Identify communication issues

### Documentation
- Export scripts for team sharing
- Document API workflows
- Create reproducible test cases

## Tips & Best Practices

### Recording
- Stop recording when done to avoid capturing unnecessary messages
- Name behaviors descriptively for easy identification
- Review messages before saving to remove noise

### Replaying
- Test with single repeat first before bulk replay
- Use intervals for rate-limited APIs
- Monitor connection status during replay

### Editing
- Validate binary data format before saving
- Keep message sequences logical and complete
- Backup important behaviors via export

## Troubleshooting

### No Connections Showing
- Ensure the page uses WebSocket
- Refresh the page after opening DevTools
- Check if WebSocket connections are established

### Recording Not Working
- Verify recording button is red (active)
- Check console for errors
- Ensure content script is injected

### Replay Fails
- Verify target server is accessible
- Check connection parameters match original
- Review error messages in status panel

### Messages Not Appearing
- Confirm correct connection is selected
- Check if messages were filtered
- Verify recording was active during transmission

## License

MIT License - Feel free to use and modify for your needs.

## Version History

### v1.0.0
- Initial release
- WebSocket message recording
- Behavior management
- Message replay with configuration
- Multi-format export
- Binary message support
- Real-time time estimation
