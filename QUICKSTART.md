# Quick Start Guide - WSS Recorder

## Installation (30 seconds)

1. **Load Extension**
   - Open Chrome → `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `wss-proxy` folder

2. **Verify**
   - You should see the 📡 icon in your toolbar
   - Click it to see the popup

## First Recording (2 minutes)

### Step 1: Open DevTools
- Go to any website with WebSocket (e.g., a chat app, trading platform)
- Press `F12` or right-click → "Inspect"

### Step 2: Find WSS Panel
- Look for the **"WSS Panel"** tab in DevTools
- Click to activate it

### Step 3: Start Recording
- Click the red **Record** button 🔴
- The status should show "Recording..."
- Interact with the webpage (send messages, click buttons, etc.)

### Step 4: Stop & Save
- Click the Record button again to stop ⏹️
- Click **"Save Behavior"**
- Enter a name (e.g., "Login Sequence")
- Click **"Save"**

## Replay Your First Behavior (1 minute)

### Step 1: Navigate to Behaviors
- Click the **"Behaviors"** tab
- Find your saved behavior

### Step 2: Configure Replay
- Click **"Replay"** button
- Set options:
  - **Repeat Count**: How many times? (try 3)
  - **Replay Interval**: Wait between replays? (try 2 seconds)
  - Watch the **Estimated Time** update automatically

### Step 3: Execute
- Click **"Start Replay"**
- Watch the progress panel
- See messages being sent/received in real-time

## Edit Messages (Optional)

### Edit Text Message
1. Click **"View Details"** on a behavior
2. Find a message you want to change
3. Click the **Edit** button (✏️)
4. Modify the text
5. Click **"Save"**

### Edit Binary Message
1. Same as above, but for binary messages
2. Edit in hexadecimal format
3. Ensure valid hex characters (0-9, A-F)
4. Click **"Save"**

## Export Scripts

### Node.js Export
1. Go to **Behaviors** tab
2. Click **"Export"** on a behavior
3. Select **"Node.js Script"**
4. Download the `.js` file
5. Run with: `node your-script.js`

### Python Export
1. Same steps as above
2. Select **"Python Script"**
3. Download the `.py` file
4. Run with: `python your-script.py`

## Common Workflows

### Workflow 1: Test Automation
```
1. Record user actions → Save as "Test Scenario 1"
2. Set repeat count to 10
3. Set interval to 5 seconds
4. Click replay → Automated testing!
```

### Workflow 2: API Documentation
```
1. Record API calls → Save as "API Flow"
2. Export as Node.js script
3. Share with team members
4. They can replay to understand the flow
```

### Workflow 3: Debug Analysis
```
1. Record problematic interactions
2. Review messages in detail view
3. Identify patterns or errors
4. Edit messages to test fixes
5. Replay modified sequence
```

## Tips & Tricks

### 💡 Pro Tips

1. **Name Behaviors Clearly**
   - Good: "User Login Flow"
   - Bad: "Behavior 1"

2. **Clean Up Before Saving**
   - Delete irrelevant messages
   - Keep only essential sequences

3. **Use Intervals Wisely**
   - Rate-limited APIs: Add 1-2 second intervals
   - Real-time apps: Use 0 interval
   - Load testing: Use short intervals (0.1s)

4. **Test Single Repeat First**
   - Always try 1 repeat before bulk replay
   - Verify everything works correctly

5. **Backup Important Behaviors**
   - Export behaviors regularly
   - Store JSON exports safely

### ⚠️ Common Pitfalls

1. **No Connections Showing?**
   - Refresh the page after opening DevTools
   - Ensure WebSocket connections exist

2. **Recording Not Capturing?**
   - Check if button is red (active)
   - Verify correct connection selected

3. **Replay Failing?**
   - Server might be down
   - Connection parameters changed
   - Check error messages in status panel

4. **Binary Data Errors?**
   - Ensure valid hex format
   - No spaces or special characters
   - Even number of characters

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Open DevTools | `F12` or `Ctrl+Shift+I` |
| Close DevTools | `Esc` |
| Switch Panels | `Ctrl+]` / `Ctrl+[` |

## Next Steps

- ✅ Try recording different types of interactions
- ✅ Experiment with various replay configurations
- ✅ Export and run scripts outside Chrome
- ✅ Share behaviors with your team
- ✅ Create a library of common sequences

## Need Help?

- Check the full [README.md](README.md) for detailed documentation
- Review [FEATURES.md](FEATURES.md) for complete feature list
- Inspect console logs for debugging information
- Check Chrome extension errors at `chrome://extensions/`

---

**Happy Recording! 🎯**
