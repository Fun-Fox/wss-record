# Project Structure - WSS Recorder

## Directory Overview

```
wss-proxy/
│
├── 📄 manifest.json              # Chrome Extension manifest (V3)
├── 📄 README.md                  # Main documentation (English)
├── 📄 FEATURES.md                # Feature overview (Chinese)
├── 📄 QUICKSTART.md              # Quick start guide
├── 📄 CHANGELOG.md               # Version history
├── 📄 PROJECT_STRUCTURE.md       # This file
│
├── 🔧 generate-icons.js          # Icon generation script
│
├── 📁 src/                       # Source code
│   ├── 📁 background/            # Service worker (background process)
│   │   └── service-worker.js     # Core logic, storage management
│   │
│   ├── 📁 content/               # Content scripts (page injection)
│   │   ├── content-script.js     # Bridge between page and extension
│   │   └── injected-script.js    # WebSocket interceptor (runs in page)
│   │
│   ├── 📁 devtools/              # DevTools panel
│   │   ├── devtools.html         # DevTools entry point
│   │   ├── devtools.js           # Panel registration
│   │   ├── panel.html            # Main UI structure
│   │   ├── panel.css             # Dark theme styling
│   │   └── panel.js              # All panel logic & interactions
│   │
│   ├── 📁 popup/                 # Browser action popup
│   │   ├── popup.html            # Popup UI structure
│   │   └── popup.js              # Popup logic
│   │
│   └── 📁 icons/                 # Extension icons
│       ├── icon-16.png           # 16x16 pixels
│       ├── icon-48.png           # 48x48 pixels
│       ├── icon-128.png          # 128x128 pixels
│       └── icon.svg              # Source SVG
│
└── 📁 templates/                 # Export script templates
    ├── node-ws-script.js         # Node.js export template
    └── python-websocket-script.py # Python export template
```

## File Descriptions

### Root Files

#### `manifest.json`
**Purpose**: Chrome Extension configuration
**Key Settings**:
- Extension name: "WSS Recorder"
- Version: 1.0.0
- Permissions: storage, webRequest, activeTab, tabs, scripting
- Background service worker location
- Content script injection rules
- DevTools panel registration

#### Documentation Files
- **README.md**: Complete English documentation with installation, usage, architecture
- **FEATURES.md**: Chinese feature list and technical details
- **QUICKSTART.md**: Step-by-step getting started guide
- **CHANGELOG.md**: Version history and future roadmap
- **PROJECT_STRUCTURE.md**: This file - directory organization

#### `generate-icons.js`
**Purpose**: Generate PNG icons from SVG source
**Usage**: `node generate-icons.js`
**Output**: Creates icon-16.png, icon-48.png, icon-128.png

---

### Source Code (`src/`)

#### Background Service Worker (`src/background/`)

**`service-worker.js`** (≈1000 lines)
- **Role**: Central coordinator for the extension
- **Responsibilities**:
  - Track all WebSocket connections across tabs
  - Store and retrieve recorded messages
  - Manage behavior configurations
  - Handle replay execution
  - Process import/export operations
  - Coordinate communication between components
- **Key Functions**:
  - `handleWebSocketMessage()`: Process intercepted messages
  - `saveBehavior()`: Persist behavior to storage
  - `loadBehaviors()`: Retrieve saved behaviors
  - `startReplay()`: Execute behavior replay
  - `exportBehavior()`: Generate script files

#### Content Scripts (`src/content/`)

**`content-script.js`** (≈150 lines)
- **Role**: Bridge between webpage and extension
- **Responsibilities**:
  - Inject `injected-script.js` into page context
  - Forward messages from page to extension
  - Receive commands from extension to page
  - Maintain isolated execution context
- **Communication Flow**:
  ```
  Page ←→ Content Script ←→ Service Worker ←→ DevTools Panel
  ```

**`injected-script.js`** (≈300 lines)
- **Role**: WebSocket interceptor (runs in page context)
- **Responsibilities**:
  - Override native `WebSocket` constructor
  - Capture `send()` calls
  - Intercept message events
  - Filter based on recording state
  - Preserve original WebSocket functionality
- **Key Features**:
  - Non-intrusive interception
  - Binary message support
  - Connection metadata tracking
  - Real-time message forwarding

#### DevTools Panel (`src/devtools/`)

**`devtools.html`** (minimal)
- **Purpose**: Entry point for DevTools panel
- **Content**: Loads `devtools.js`

**`devtools.js`** (≈30 lines)
- **Purpose**: Register panel with Chrome DevTools
- **Creates**: "WSS Panel" tab in DevTools
- **Panel Title**: "WSS Panel"
- **Icon**: 16x16 extension icon

**`panel.html`** (≈384 lines)
- **Purpose**: Main UI structure
- **Sections**:
  - Header: Logo, status indicators, message count
  - Toolbar: Record button, connection selector, clear button
  - Tabs: Connections, Messages, Behaviors
  - Modals: Behavior detail, replay status
- **Key Elements**:
  - Connection list container
  - Message timeline
  - Behavior cards
  - Configuration inputs (repeat count, interval)
  - Estimate time display

**`panel.css`** (≈1200 lines)
- **Purpose**: Complete styling for dark theme
- **Design System**:
  - CSS custom properties (variables)
  - Consistent spacing scale
  - Color palette (dark grays, blue accents)
  - Typography system
  - Component styles
- **Key Components**:
  - Buttons (primary, secondary, danger)
  - Forms (inputs, selects, textareas)
  - Cards (connections, behaviors)
  - Modals (detail view, replay status)
  - Status indicators (recording, idle)
  - Timeline visualization

**`panel.js`** (≈2000 lines)
- **Purpose**: All panel logic and user interactions
- **Major Sections**:
  1. **State Management** (lines 1-100)
     - Recording state
     - Current connection
     - Selected behavior
     - UI element references
  
  2. **Initialization** (lines 100-250)
     - Event listener setup
     - State restoration
     - Initial UI rendering
  
  3. **Recording Logic** (lines 250-500)
     - Start/stop recording
     - Connection filtering
     - Message capture
     - Status updates
  
  4. **Connection Management** (lines 500-700)
     - Display connections
     - Select/deselect
     - Status indicators
     - Filtering
  
  5. **Message Display** (lines 700-900)
     - Render message timeline
     - Format text/binary messages
     - Scroll management
     - Auto-scroll toggle
  
  6. **Behavior Management** (lines 900-1300)
     - Save behaviors
     - Edit messages
     - Delete messages
     - Clear behaviors
     - Import/export
  
  7. **Replay System** (lines 1300-1800)
     - Configure replay (count, interval)
     - Calculate time estimates
     - Execute replay
     - Progress tracking
     - Status display
  
  8. **Utility Functions** (lines 1800-2000)
     - Data formatting
     - Validation
     - Error handling
     - Toast notifications

#### Popup (`src/popup/`)

**`popup.html`** (≈157 lines)
- **Purpose**: Browser action popup UI
- **Sections**:
  - Header: Logo, recording status badge
  - Main hint: Instructions to open DevTools
  - Footer: Additional info
- **Status Indicator**: Shows if recording is active

**`popup.js`** (≈50 lines)
- **Purpose**: Popup logic
- **Responsibilities**:
  - Check recording state
  - Update status indicator
  - Display current status
  - Provide quick access info

#### Icons (`src/icons/`)

**Icon Files**:
- `icon-16.png`: Toolbar icon, DevTools tab
- `icon-48.png`: Extensions page, medium displays
- `icon-128.png`: Chrome Web Store, large displays
- `icon.svg`: Source vector graphic

**Generation**: Run `node generate-icons.js` to regenerate from SVG

---

### Templates (`templates/`)

**`node-ws-script.js`** (≈150 lines)
- **Purpose**: Template for Node.js export
- **Library**: Uses `ws` package
- **Features**:
  - Connection establishment
  - Message sending/receiving
  - Binary message handling
  - Error handling
  - Configurable delays
- **Usage**: User installs `ws`, runs generated script

**`python-websocket-script.py`** (≈150 lines)
- **Purpose**: Template for Python export
- **Library**: Uses `websockets` package
- **Features**:
  - Async connection handling
  - Message sequencing
  - Binary data support
  - Exception handling
  - Timing control
- **Usage**: User installs `websockets`, runs generated script

---

## Communication Flow

### Message Interception
```
1. Webpage creates WebSocket
   ↓
2. injected-script.js intercepts constructor
   ↓
3. Captures send() and onmessage events
   ↓
4. Forwards to content-script.js via postMessage
   ↓
5. Content script sends to service-worker.js via chrome.runtime.sendMessage
   ↓
6. Service worker stores in chrome.storage.local
   ↓
7. DevTools panel receives update via chrome.runtime.onMessage
   ↓
8. Panel.js updates UI to show new message
```

### Behavior Replay
```
1. User clicks "Replay" in panel.js
   ↓
2. Panel sends REPLAY_BEHAVIOR message to service worker
   ↓
3. Service worker loads behavior from storage
   ↓
4. Establishes new WebSocket connection
   ↓
5. Sends messages in sequence with configured intervals
   ↓
6. Reports progress back to panel
   ↓
7. Panel displays real-time status
   ↓
8. Completion notification shown
```

---

## Key Technologies

### Chrome Extensions API
- `chrome.storage.local`: Persistent data storage
- `chrome.runtime.sendMessage`: Cross-context communication
- `chrome.devtools.panels`: DevTools integration
- `chrome.tabs`: Tab management
- `chrome.scripting`: Script injection

### Web APIs
- `WebSocket`: Native WebSocket API (intercepted)
- `ArrayBuffer`: Binary data handling
- `postMessage`: Cross-context messaging
- `localStorage`: Temporary state (avoided in favor of chrome.storage)

### JavaScript Features
- ES6+ syntax (const, let, arrow functions, async/await)
- Module pattern (IIFE in some files)
- Event-driven architecture
- Promise-based asynchronous operations

### CSS Features
- CSS Custom Properties (variables)
- Flexbox layout
- Grid layout (where applicable)
- Animations (pulse effect for recording)
- Dark theme color scheme
- Responsive design principles

---

## Development Workflow

### Making Changes

1. **Edit Source Files**
   - Modify `.js`, `.html`, or `.css` files
   - No build step required (vanilla JS)

2. **Reload Extension**
   - Go to `chrome://extensions/`
   - Find "WSS Recorder"
   - Click reload icon 🔄

3. **Test Changes**
   - Open DevTools on a test page
   - Verify functionality
   - Check console for errors

### Debugging

**Service Worker**:
- `chrome://extensions/` → "Inspect views: service worker"

**DevTools Panel**:
- Right-click panel → "Inspect"

**Content Script**:
- Page DevTools → Console tab
- Look for `[WSS]` prefixed logs

**Injected Script**:
- Page DevTools → Console tab
- Look for `[WSS Injected]` prefixed logs

### Best Practices

1. **Logging**: Use consistent prefixes (`[WSS]`, `[WSS Injected]`)
2. **Error Handling**: Wrap async operations in try-catch
3. **State Management**: Keep state in service worker, not panels
4. **Performance**: Minimize DOM updates, batch when possible
5. **Security**: Validate all inputs, sanitize outputs

---

## File Size Reference

| File | Lines | Purpose |
|------|-------|---------|
| service-worker.js | ~1000 | Backend logic |
| panel.js | ~2000 | Frontend logic |
| panel.css | ~1200 | Styling |
| panel.html | ~384 | UI structure |
| injected-script.js | ~300 | WS interceptor |
| content-script.js | ~150 | Injection bridge |
| popup.html | ~157 | Popup UI |
| devtools.js | ~30 | Panel registration |

**Total**: ~5,200 lines of code

---

## Naming Conventions

### Files
- kebab-case: `service-worker.js`, `content-script.js`
- Descriptive: `injected-script.js`, `panel.js`

### Variables
- camelCase: `recordingState`, `currentBehaviorId`
- Prefix with type when helpful: `btnRecord`, `statusDot`

### Functions
- camelCase: `startRecording()`, `saveBehavior()`
- Verb-first: `getMessageCount()`, `updateStatus()`

### CSS Classes
- kebab-case: `.recording-status`, `.message-timeline`
- BEM-like: `.btn--primary`, `.card__header`

---

## Extension Points

### Adding New Features

1. **New Message Type**
   - Modify `injected-script.js` to capture
   - Update `service-worker.js` to store
   - Update `panel.js` to display

2. **New Export Format**
   - Create template in `templates/`
   - Add export logic in `service-worker.js`
   - Add UI option in `panel.html/js`

3. **New UI Component**
   - Add HTML in `panel.html`
   - Style in `panel.css`
   - Logic in `panel.js`
   - State in `service-worker.js`

### Integration Points

- **Testing Frameworks**: Export scripts can integrate with Jest, Mocha, pytest
- **CI/CD**: Generated scripts can run in automated pipelines
- **Monitoring**: Add logging hooks for analytics
- **Custom Protocols**: Extend interceptor for other protocols

---

## Performance Considerations

### Storage
- Behaviors stored in `chrome.storage.local` (5-10MB limit)
- Large message sets may hit limits
- Consider pagination for very large behaviors

### Memory
- Messages kept in memory during recording
- Cleared after saving to behavior
- Avoid keeping unnecessary data

### UI Rendering
- Virtual scrolling for large message lists (future improvement)
- Batch DOM updates
- Debounce frequent updates

### Network
- Minimal overhead when not recording
- Injection happens once per page load
- Efficient message forwarding

---

## Security Notes

1. **Content Security Policy**: Manifest V3 enforces strict CSP
2. **No eval()**: All code is static, no dynamic evaluation
3. **Input Validation**: All user inputs validated before use
4. **XSS Prevention**: Text content properly escaped in UI
5. **Permission Minimization**: Only required permissions requested

---

For more information, see:
- [README.md](README.md) - Complete documentation
- [FEATURES.md](FEATURES.md) - Feature details
- [QUICKSTART.md](QUICKSTART.md) - Getting started
