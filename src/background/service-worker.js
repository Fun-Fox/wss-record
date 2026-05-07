/**
 * Background Service Worker - WSS Recorder Core
 *
 * Manages WebSocket connection tracking, message interception,
 * and coordinates between content scripts and DevTools panel.
 */

// ============================================================
// State Management
// ============================================================

const tabConnections = new Map();
const activeSessions = new Map();

let globalState = {
  isRecording: false,
  currentSessionId: null,
  recordStartTime: null
};

// 关键修复：在 service-worker 启动时立即恢复状态
// 注意：chrome.storage.local.get 是异步的，但我们在消息处理时会检查 globalState
// 如果 globalState.recordStartTime 不存在，会从 storage 同步读取
let stateRestored = false;

// 立即执行状态恢复
(async function initAndRestoreState() {
  try {
    const result = await chrome.storage.local.get(['wss_recorder_state']);
    if (result.wss_recorder_state && result.wss_recorder_state.isRecording) {
      const saved = result.wss_recorder_state;
      globalState.isRecording = saved.isRecording;
      globalState.currentSessionId = saved.currentSessionId;
      globalState.recordStartTime = saved.recordStartTime;
      console.log('[WSS Recorder] State restored:', globalState);
    }
    stateRestored = true;
  } catch (err) {
    console.error('[WSS Recorder] Failed to restore state:', err);
    stateRestored = true; // 即使失败也标记为已恢复，避免阻塞
  }
})();

// ============================================================
// Message Handler
// ============================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, payload } = message;

  switch (type) {
    case 'WS_MESSAGE_CAPTURED':
      handleWebSocketMessage(payload, sender, 'send');
      break;

    // case 'WS_MESSAGE_RECEIVED':  // 移除 receive 事件处理
    //   handleWebSocketMessage(payload, sender, 'receive');
    //   break;

    case 'WS_CONNECTION_OPENED':
      handleConnectionOpened(payload, sender);
      break;

    case 'WS_CONNECTION_CLOSED':
      handleConnectionClosed(payload, sender);
      break;

    case 'START_RECORDING':
      startRecording(payload, sendResponse);
      return true;

    case 'STOP_RECORDING':
      stopRecording(payload, sendResponse);
      return true;

    case 'GET_SESSION_DATA':
      getSessionData(payload, sendResponse);
      return true;

    case 'GET_RECORDING_STATE':
      getRecordingState(sendResponse);
      return true;

    case 'EXPORT_SCRIPT':
      exportScript(payload, sendResponse);
      return true;

    case 'START_REPLAY':
      startReplay(payload, sendResponse);
      return true;

    case 'STOP_REPLAY':
      stopReplay(payload, sendResponse);
      return true;

    case 'REPLAY_SEND_MESSAGE':
      replaySendMessage(payload, sendResponse);
      return true;

    case 'INJECT_INTERCEPTOR':
      injectInterceptor(sender.tab?.id, sendResponse);
      return true;

    case 'SAVE_BEHAVIOR':
      saveBehavior(payload, sendResponse);
      return true;

    case 'GET_BEHAVIORS':
      getBehaviors(sendResponse);
      return true;

    case 'GET_BEHAVIOR':
      getBehavior(payload, sendResponse);
      return true;

    case 'UPDATE_BEHAVIOR':
      updateBehavior(payload, sendResponse);
      return true;

    case 'DELETE_BEHAVIOR':
      deleteBehavior(payload, sendResponse);
      return true;

    case 'REPLAY_BEHAVIOR':
      replayBehavior(payload, sendResponse);
      return true;

    case 'GET_CONNECTIONS':
      getAllConnections(sendResponse);
      return true;

    default:
      console.warn('[WSS Recorder] Unknown message type:', type);
  }
});

// ============================================================
// Connection Management
// ============================================================

function handleConnectionOpened(payload, sender) {
  if (!payload) return;
  const { tabId } = sender;
  const connectionId = payload.connectionId || generateConnectionId();

  if (!tabConnections.has(tabId)) {
    tabConnections.set(tabId, []);
  }

  const connections = tabConnections.get(tabId);
  const conn = {
    connectionId,
    url: payload.url,
    protocols: payload.protocols || [],
    cookies: payload.cookies || '',
    openedAt: Date.now(),
    frameId: sender.frameId,
    status: 'open'
  };
  connections.push(conn);

  // Also store connection metadata in session while recording
  if (globalState.recordStartTime && globalState.currentSessionId) {
    const session = activeSessions.get(globalState.currentSessionId);
    if (session) {
      if (!session.metadata?.cookies) {
        session.metadata = session.metadata || {};
        session.metadata.cookies = payload.cookies || '';
      }

      session.connections = session.connections || [];
      const existingConn = session.connections.find(c => c.connectionId === connectionId);
      const sessionConn = {
        connectionId,
        url: payload.url,
        protocols: payload.protocols || [],
        cookies: payload.cookies || '',
        openedAt: conn.openedAt,
        status: 'open'
      };

      if (existingConn) {
        Object.assign(existingConn, sessionConn);
      } else {
        session.connections.push(sessionConn);
      }
    }
  }

  chrome.runtime.sendMessage({
    type: 'CONNECTION_UPDATE',
    payload: {
      tabId,
      connectionId,
      url: payload.url,
      status: 'open',
      cookies: payload.cookies || ''
    }
  }).catch(() => {});

  console.log(`[WSS Recorder] WebSocket opened: ${payload.url} (tab: ${tabId})`);
}

function handleConnectionClosed(payload, sender) {
  if (!payload) return;
  const { tabId } = sender;
  const connections = tabConnections.get(tabId) || [];

  const conn = connections.find(c => c.connectionId === payload.connectionId);
  if (conn) {
    conn.status = 'closed';
    conn.closedAt = Date.now();
    conn.closeCode = payload.code;
    conn.closeReason = payload.reason;
  }

  if (globalState.recordStartTime && globalState.currentSessionId) {
    const session = activeSessions.get(globalState.currentSessionId);
    const sessionConn = session?.connections?.find(c => c.connectionId === payload.connectionId);
    if (sessionConn) {
      sessionConn.status = 'closed';
      sessionConn.closedAt = Date.now();
      sessionConn.closeCode = payload.code;
      sessionConn.closeReason = payload.reason;
    }
  }

  chrome.runtime.sendMessage({
    type: 'CONNECTION_UPDATE',
    payload: { tabId, connectionId: payload.connectionId, status: 'closed', code: payload.code }
  }).catch(() => {});
}

function getAllConnections(sendResponse) {
  const allConnections = [];
  
  tabConnections.forEach((connections, tabId) => {
    connections.forEach(conn => {
      allConnections.push({
        ...conn,
        tabId
      });
    });
  });
  
  sendResponse({ success: true, connections: allConnections });
}

// ============================================================
// Message Filtering Logic
// ============================================================

/**
 * Check if a message should be filtered based on filter settings
 * @param {Object} payload - The message payload
 * @param {Object} filterSettings - The filter settings
 * @returns {boolean} - True if the message should be filtered (skipped)
 */
function shouldFilterMessage(payload, filterSettings) {
  if (!filterSettings) return false;

  // 1. Check message type filter
  const dataType = payload.dataType || detectDataType(payload.data);
  if (filterSettings.types && !filterSettings.types[dataType]) {
    console.log('[Filter] Type filtered:', dataType);
    return true; // Filter out this type
  }

  // 2. Check keyword filter
  if (filterSettings.keywords && filterSettings.keywords.length > 0) {
    const dataStr = typeof payload.data === 'string' ? payload.data : JSON.stringify(payload.data);
    const hasKeyword = filterSettings.keywords.some(keyword => 
      dataStr.toLowerCase().includes(keyword.toLowerCase())
    );
    if (hasKeyword) {
      console.log('[Filter] Keyword filtered');
      return true; // Contains filtered keyword
    }
  }

  // 3. Check URL pattern filter
  if (filterSettings.urlPattern && payload.url) {
    const urlPattern = filterSettings.urlPattern.replace(/\*/g, '.*');
    const regex = new RegExp(urlPattern, 'i');
    if (!regex.test(payload.url)) {
      console.log('[Filter] URL pattern filtered:', payload.url);
      return true; // URL doesn't match pattern
    }
  }

  return false; // Don't filter
}

function handleWebSocketMessage(payload, sender, direction) {
  if (!payload) return;
  const { tabId } = sender;
  
  // 关键修复：如果 globalState.recordStartTime 不存在，尝试从 storage 读取
  // 这是处理 Service Worker 休眠后唤醒的情况
  if (!globalState.recordStartTime) {
    chrome.storage.local.get(['wss_recorder_state'], (result) => {
      if (result.wss_recorder_state && result.wss_recorder_state.isRecording) {
        const saved = result.wss_recorder_state;
        globalState.isRecording = saved.isRecording;
        globalState.currentSessionId = saved.currentSessionId;
        globalState.recordStartTime = saved.recordStartTime;
        
        // 现在重新处理这条消息
        processMessage(payload, sender, direction);
      }
    });
    return; // 等待 storage 读取完成后重新处理
  }
  
  // 如果 globalState.recordStartTime 存在，直接处理
  processMessage(payload, sender, direction);
}

function processMessage(payload, sender, direction) {
  const { tabId } = sender;
  
  const session = globalState.currentSessionId ? activeSessions.get(globalState.currentSessionId) : null;

  // 如果录制时指定了 filterConnectionId，只录制该连接的消息
  if (session && session.filterConnectionId && payload.connectionId !== session.filterConnectionId) {
    console.log('[WSS Recorder] Skipping message from connection', payload.connectionId, '(filtered by connectionId)');
    return; // 跳过非目标连接的消息
  }

  // 应用过滤设置
  if (session && session.filterSettings && shouldFilterMessage(payload, session.filterSettings)) {
    console.log('[WSS Recorder] Skipping message (filtered by settings):', payload.data?.substring(0, 50));
    return; // 跳过被过滤的消息
  }

  // Increment per-connection message count
  const connections = tabConnections.get(tabId) || [];
  const conn = connections.find(c => c.connectionId === payload.connectionId);
  if (conn) {
    conn.messageCount = (conn.messageCount || 0) + 1;
  }

  const messageData = {
    connectionId: payload.connectionId,
    direction: direction || 'send', // 支持 send 和 receive
    data: payload.data,
    dataType: payload.dataType || detectDataType(payload.data),
    replayData: payload.replayData || {
      format: 'text',
      value: typeof payload.data === 'string'
        ? payload.data
        : (payload.data === undefined || payload.data === null ? '' : String(payload.data))
    },
    protocols: payload.protocols || conn?.protocols || [],
    timestamp: Date.now(),
    // 使用全局状态计算 relativeTime
    relativeTime: globalState.recordStartTime ? Date.now() - globalState.recordStartTime : 0,
    tabId,
    frameId: sender.frameId,
    url: payload.url,
    size: payload.size || 0
  };

  if (session) {
    session.messages.push(messageData);
    session.messageCount++;

    if (session.messageCount % 50 === 0) {
      saveSessionToStorage(session);
    }
  }

  chrome.runtime.sendMessage({
    type: 'NEW_MESSAGE',
    payload: messageData
  }).catch(() => {});
}

// ============================================================
// Recording Control
// ============================================================

function startRecording(payload, sendResponse) {
  if (!payload) {
    sendResponse({ success: false, error: 'No payload provided' });
    return;
  }
  const sessionId = payload.sessionId || generateSessionId();
  const tabId = payload.tabId;

  const session = {
    sessionId,
    tabId,
    url: payload.url || '',
    startedAt: Date.now(),
    messages: [],
    messageCount: 0,
    connections: [],
    metadata: payload.metadata || {},
    filterConnectionId: payload.filterConnectionId || null,  // 存储要录制的连接ID
    filterSettings: payload.filterSettings || null  // 存储过滤设置
  };

  activeSessions.set(sessionId, session);
  globalState.isRecording = true;
  globalState.currentSessionId = sessionId;
  globalState.recordStartTime = Date.now();

  // Persist state to storage
  persistState();

  // Broadcast to all listeners (popup, DevTools panel)
  chrome.runtime.sendMessage({
    type: 'RECORDING_STARTED',
    payload: { sessionId, tabId, timestamp: Date.now() }
  }).catch(() => {});

  // Inject WebSocket interceptor
  injectInterceptor(tabId, () => {
    sendResponse({ success: true, sessionId });
  });
}

function stopRecording(payload, sendResponse) {
  const sessionId = (payload && payload.sessionId) || globalState.currentSessionId;
  const session = activeSessions.get(sessionId);
  const messageCount = session ? session.messageCount : 0;

  if (session) {
    session.stoppedAt = Date.now();
    session.duration = session.stoppedAt - session.startedAt;
    saveSessionToStorage(session);
  }

  // Broadcast to all listeners before clearing state
  chrome.runtime.sendMessage({
    type: 'RECORDING_STOPPED',
    payload: { sessionId, messageCount, duration: session?.duration, timestamp: Date.now() }
  }).catch(() => {});

  globalState.isRecording = false;
  globalState.currentSessionId = null;
  globalState.recordStartTime = null;

  // Persist state to storage
  persistState();

  sendResponse({
    success: true,
    sessionId,
    messageCount
  });
}

function getSessionData(payload, sendResponse) {
  const sessionId = (payload && payload.sessionId) || globalState.currentSessionId;

  if (sessionId === 'list') {
    chrome.storage.local.get(['wss_sessions'], (result) => {
      const sessions = result.wss_sessions || {};
      sendResponse({
        success: true,
        sessions: Object.values(sessions).map(s => ({
          sessionId: s.sessionId,
          url: s.url,
          startedAt: s.startedAt,
          messageCount: s.messageCount,
          duration: s.duration
        }))
      });
    });
    return;
  }

  const session = activeSessions.get(sessionId);
  if (session) {
    sendResponse({ success: true, session });
  } else {
    chrome.storage.local.get([`session_${sessionId}`], (result) => {
      const saved = result[`session_${sessionId}`];
      sendResponse(saved ? { success: true, session: saved } : { success: false, error: 'Session not found' });
    });
  }
}

// ============================================================
// Script Export
// ============================================================

function exportScript(payload, sendResponse) {
  if (!payload) {
    sendResponse({ success: false, error: 'No payload provided' });
    return;
  }
  const { sessionId, format, options = {} } = payload;

  const resolveSession = (session) => {
    if (!session) {
      sendResponse({ success: false, error: 'Session not found' });
      return;
    }
    generateScript(session, format, options, sendResponse);
  };

  const session = activeSessions.get(sessionId);
  if (session) {
    resolveSession(session);
  } else {
    chrome.storage.local.get([`session_${sessionId}`], (result) => {
      resolveSession(result[`session_${sessionId}`]);
    });
  }
}

function generateScript(session, format, options, callback) {
  let script = '';
  const messages = session.messages.filter(m => m.direction === 'send');

  switch (format) {
    case 'node-ws':
      script = generateNodeWSScript(session, messages, options);
      break;
    case 'python-websocket':
      script = generatePythonScript(session, messages, options);
      break;
    case 'browser-js':
      script = generateBrowserJSScript(session, messages, options);
      break;
    default:
      script = generateNodeWSScript(session, messages, options);
  }

  callback({ success: true, script, format });
}

function generateNodeWSScript(session, messages, options) {
  // Priority: message URL > connection URL > session URL (page URL)
  const wsUrl = messages[0]?.url || session.connections[0]?.url || session.url || 'wss://example.com';
  const delayBetweenMessages = options.delayBetweenMessages ?? true;

  const messagesJson = messages.map((msg, index) => {
    const relativeDelay = index > 0
      ? msg.relativeTime - messages[index - 1].relativeTime
      : msg.relativeTime;
    return `  {
    index: ${index},
    data: ${JSON.stringify(msg.data)},
    dataType: '${msg.dataType}',
    relativeTime: ${msg.relativeTime},
    ${delayBetweenMessages ? `delay: ${relativeDelay},` : ''}
    url: '${(msg.url || wsUrl).replace(/'/g, "\\'")}'
  }`;
  }).join(',\n');

  return `/**
 * WSS Replay Script - Node.js (ws library)
 * Generated by WSS Recorder & Replayer
 * Session: ${session.sessionId}
 * Original URL: ${wsUrl}
 * Messages: ${messages.length}
 * Generated: ${new Date().toISOString()}
 *
 * Usage: npm install ws && node wss-replay.js
 */

const WebSocket = require('ws');

const WS_URL = '${wsUrl.replace(/'/g, "\\'")}';
const PROTOCOLS = ${JSON.stringify(session.connections[0]?.protocols || [])};
const COOKIES = '${(session.metadata?.cookies || session.connections[0]?.cookies || '').replace(/'/g, "\\'")}';

const CONFIG = {
  reconnectAttempts: ${options.reconnectAttempts || 3},
  reconnectDelay: ${options.reconnectDelay || 1000},
  logLevel: '${options.logLevel || 'info'}',
  verifySSL: ${options.verifySSL !== false},
  replayWithTiming: ${delayBetweenMessages}
};

const WS_OPTIONS = { rejectUnauthorized: CONFIG.verifySSL };
if (COOKIES) {
  WS_OPTIONS.headers = { 'Cookie': COOKIES };
}

const MESSAGE_QUEUE = [
${messagesJson}
];

const logger = {
  debug: (msg) => CONFIG.logLevel === 'debug' && console.debug('[DEBUG]', msg),
  info: (msg) => ['debug', 'info'].includes(CONFIG.logLevel) && console.info('[INFO]', msg),
  warn: (msg) => console.warn('[WARN]', msg),
  error: (msg) => console.error('[ERROR]', msg)
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runReplay() {
  logger.info(\`Starting WSS replay: \${MESSAGE_QUEUE.length} messages\`);

  for (let attempt = 1; attempt <= CONFIG.reconnectAttempts; attempt++) {
    try {
      logger.info(\`Connection attempt \${attempt}/\${CONFIG.reconnectAttempts}\`);

      const ws = new WebSocket(WS_URL, PROTOCOLS, WS_OPTIONS);

      await new Promise((resolve, reject) => {
        ws.on('open', () => { logger.info('WebSocket connected'); resolve(); });
        ws.on('error', (err) => reject(err));
        setTimeout(() => reject(new Error('Connection timeout')), 10000);
      });

      const received = [];
      ws.on('message', (data) => {
        received.push(data.toString());
        logger.debug(\`Received: \${data.toString().substring(0, 100)}...\`);
      });

      let startTime = Date.now();
      for (let i = 0; i < MESSAGE_QUEUE.length; i++) {
        const message = MESSAGE_QUEUE[i];

        if (CONFIG.replayWithTiming && message.delay > 0) {
          const elapsed = Date.now() - startTime;
          const waitTime = message.delay - (elapsed - (message.relativeTime - message.delay > 0 ? message.relativeTime - message.delay : 0));
          if (waitTime > 0) await sleep(waitTime);
        }

        const data = typeof message.data === 'string' ? message.data : JSON.stringify(message.data);
        logger.info(\`Sending message #\${message.index} (\${message.dataType})\`);

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }

        if (!CONFIG.replayWithTiming) await sleep(100);
      }

      logger.info('All messages sent. Waiting for responses...');
      await sleep(10000);
      logger.info(\`Received \${received.length} responses\`);

      ws.close();
      break;
    } catch (err) {
      logger.error(\`Connection failed (attempt \${attempt}): \${err.message}\`);
      if (attempt < CONFIG.reconnectAttempts) await sleep(CONFIG.reconnectDelay);
    }
  }

  logger.info('Replay completed');
}

runReplay().catch((err) => {
  logger.error(\`Fatal: \${err.message}\`);
  process.exit(1);
});
`;
}

function generatePythonScript(session, messages, options) {
  // Priority: message URL > connection URL > session URL (page URL)
  const wsUrl = messages[0]?.url || session.connections[0]?.url || session.url || 'wss://example.com';

  const messagesPy = messages.map((msg, index) => {
    const relativeDelay = index > 0
      ? msg.relativeTime - messages[index - 1].relativeTime
      : msg.relativeTime;
    return `    {
        "index": ${index},
        "data": ${JSON.stringify(msg.data)},
        "data_type": "${msg.dataType}",
        "relative_time": ${msg.relativeTime},
        "delay": ${relativeDelay}
    }`;
  }).join(',\n');

  return `#!/usr/bin/env python3
"""
WSS Replay Script - Python (websockets library)
Generated by WSS Recorder & Replayer
Session: ${session.sessionId}
Messages: ${messages.length}
Generated: ${new Date().toISOString()}

Usage: pip install websockets && python wss-replay.py
"""

import asyncio
import json
import time
import logging

try:
    import websockets
except ImportError:
    print("Please install websockets: pip install websockets")
    exit(1)

logging.basicConfig(level=logging.INFO, format='[%(asctime)s] %(levelname)s: %(message)s')
logger = logging.getLogger('wss-replay')

WS_URL = "${wsUrl}"
PROTOCOLS = ${JSON.stringify(session.connections[0]?.protocols || [])}
COOKIES = "${(session.metadata?.cookies || session.connections[0]?.cookies || '').replace(/"/g, '\\"')}"

CONFIG = {
    "reconnect_attempts": ${options.reconnectAttempts || 3},
    "reconnect_delay": ${options.reconnectDelay || 1.0},
    "replay_with_timing": ${options.delayBetweenMessages !== false},
    "verify_ssl": ${options.verifySSL !== false}
}

MESSAGE_QUEUE = [
${messagesPy}
]

async def run_replay():
    logger.info(f"Starting WSS replay: {len(MESSAGE_QUEUE)} messages")

    for attempt in range(1, CONFIG["reconnect_attempts"] + 1):
        try:
            logger.info(f"Connection attempt {attempt}/{CONFIG['reconnect_attempts']}")
            ssl_context = None if CONFIG["verify_ssl"] else False
            extra_headers = {"Cookie": COOKIES} if COOKIES else {}

            async with websockets.connect(WS_URL, subprotocols=PROTOCOLS, ssl=ssl_context, extra_headers=extra_headers) as ws:
                logger.info("WebSocket connected")
                received = []

                async def recv():
                    try:
                        async for r in ws:
                            received.append(r)
                    except: pass

                asyncio.create_task(recv())

                start_time = time.time()
                for msg in MESSAGE_QUEUE:
                    if msg["delay"] > 0 and CONFIG["replay_with_timing"]:
                        elapsed = time.time() - start_time
                        wait = (msg["delay"] / 1000.0) - elapsed
                        if wait > 0: await asyncio.sleep(wait)

                    data = json.dumps(msg["data"]) if isinstance(msg["data"], dict) else msg["data"]
                    logger.info(f'Sending message #{msg["index"]} ({msg["data_type"]})')
                    await ws.send(data)

                    if not CONFIG["replay_with_timing"]:
                        await asyncio.sleep(0.1)

                logger.info("All messages sent. Waiting for responses...")
                await asyncio.sleep(10)
                logger.info(f"Received {len(received)} responses")
            break
        except Exception as e:
            logger.error(f"Connection failed (attempt {attempt}): {e}")
            if attempt < CONFIG["reconnect_attempts"]:
                await asyncio.sleep(CONFIG["reconnect_delay"])

    logger.info("Replay completed")

if __name__ == "__main__":
    try:
        asyncio.run(run_replay())
    except KeyboardInterrupt:
        logger.info("Cancelled")
    except Exception as e:
        logger.error(f"Fatal: {e}")
`;
}

function generateBrowserJSScript(session, messages, options) {
  // Priority: message URL > connection URL > session URL (page URL)
  const wsUrl = messages[0]?.url || session.connections[0]?.url || session.url || 'wss://example.com';

  const messagesJs = messages.map((msg, index) => {
    const delay = index > 0 ? msg.relativeTime - messages[index - 1].relativeTime : msg.relativeTime;
    return `    { index: ${index}, data: ${JSON.stringify(msg.data)}, delay: ${delay} }`;
  }).join(',\n');

  return `/**
 * WSS Replay Script - Browser JavaScript
 * Generated by WSS Recorder & Replayer
 * Session: ${session.sessionId}
 *
 * Usage: Paste into browser console
 */

(function() {
  'use strict';

  const WS_URL = '${wsUrl}';
  const PROTOCOLS = ${JSON.stringify(session.connections[0]?.protocols || [])};

  const MESSAGE_QUEUE = [
${messagesJs}
  ];

  async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function runReplay() {
    console.log('Starting WSS replay...');
    const ws = new WebSocket(WS_URL, PROTOCOLS);

    ws.onopen = async () => {
      console.log('Connected to', WS_URL);

      for (const msg of MESSAGE_QUEUE) {
        if (msg.delay > 0) await sleep(msg.delay);
        const data = typeof msg.data === 'string' ? msg.data : JSON.stringify(msg.data);
        ws.send(data);
        console.log('Sent message #' + msg.index);
      }

      console.log('All messages sent');
    };

    ws.onmessage = (event) => console.log('Received:', event.data);
    ws.onerror = (error) => console.error('WebSocket error:', error);
    ws.onclose = () => console.log('Connection closed');

    window.__wssReplay = { ws, stop: () => ws.close() };
  }

  runReplay();
})();
`;
}

// ============================================================
// Replay Control
// ============================================================

function startReplay(payload, sendResponse) {
  if (!payload) {
    sendResponse({ success: false, error: 'No payload provided' });
    return;
  }
  const { sessionId, tabId, options = {} } = payload;
  const session = activeSessions.get(sessionId);

  if (!session && !payload.messages) {
    sendResponse({ success: false, error: 'Session not found' });
    return;
  }

  const messages = payload.messages || session?.messages.filter(m => m.direction === 'send') || [];
  const wsUrl = payload.url || session?.url || '';

  activeSessions.set(`replay_${sessionId}`, {
    sessionId, tabId, messages, wsUrl, currentIndex: 0, isRunning: true, options
  });

  chrome.scripting.executeScript({
    target: { tabId },
    func: injectReplayScript,
    args: [messages, wsUrl, options]
  }).then(() => {
    sendResponse({ success: true, replayId: `replay_${sessionId}` });
  }).catch(err => {
    sendResponse({ success: false, error: err.message });
  });
}

function stopReplay(payload, sendResponse) {
  if (!payload) {
    sendResponse({ success: true });
    return;
  }
  const replayState = activeSessions.get(`replay_${payload.sessionId}`);
  if (replayState) replayState.isRunning = false;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'STOP_REPLAY' }).catch(() => {});
    }
  });

  sendResponse({ success: true });
}

function replaySendMessage(payload, sendResponse) {
  if (!payload) {
    sendResponse({ success: false, error: 'No payload provided' });
    return;
  }
  const { tabId, message, connectionId } = payload;

  chrome.tabs.sendMessage(tabId, {
    type: 'REPLAY_INJECT_MESSAGE',
    payload: { message, connectionId }
  }).then((response) => {
    // 检查是否有错误
    if (chrome.runtime.lastError) {
      console.error('[Replay] Error sending message to tab:', chrome.runtime.lastError.message);
      sendResponse({ success: false, error: '无法与页面通信: ' + chrome.runtime.lastError.message });
      return;
    }
    
    if (response?.success) {
      sendResponse({ success: true, response });
      return;
    }
    sendResponse({
      success: false,
      error: response?.error || 'Replay message injection failed'
    });
  }).catch(err => {
    console.error('[Replay] Failed to send message:', err);
    sendResponse({ success: false, error: '发送失败: ' + err.message });
  });
}

function injectReplayScript(messages, wsUrl, options) {
  window.__WSS_REPLAY_CONFIG = { messages, wsUrl, options };
  console.log('[WSS Replay] Configuration injected');
}

// ============================================================
// Storage Helpers
// ============================================================

function saveSessionToStorage(session) {
  const sessionMeta = {
    sessionId: session.sessionId,
    url: session.url,
    startedAt: session.startedAt,
    stoppedAt: session.stoppedAt,
    duration: session.duration,
    messageCount: session.messageCount,
    connections: session.connections?.map(c => ({
      connectionId: c.connectionId,
      url: c.url,
      status: c.status
    })) || []
  };

  chrome.storage.local.get(['wss_sessions'], (result) => {
    const sessions = result.wss_sessions || {};
    sessions[session.sessionId] = sessionMeta;
    chrome.storage.local.set({ wss_sessions: sessions });
  });
}

// ============================================================
// Behavior Management
// ============================================================

function saveBehavior(payload, sendResponse) {
  if (!payload || !payload.name) {
    sendResponse({ success: false, error: '行为名称不能为空' });
    return;
  }

  const behaviorId = payload.behaviorId || 'bhv_' + Date.now();
  const behavior = {
    behaviorId,
    name: payload.name,
    description: payload.description || '',
    url: payload.url || '',
    messages: payload.messages || [],
    cookies: payload.cookies || '',
    connectionId: payload.connectionId || null,  // 保存录制的连接ID
    replayCount: payload.replayCount || 1,  // 保存回放次数
    replayInterval: payload.replayInterval || 0,  // 保存回放间隔（秒）
    createdAt: payload.createdAt || Date.now(),
    updatedAt: Date.now()
  };

  chrome.storage.local.get(['wss_behaviors'], (result) => {
    const behaviors = result.wss_behaviors || {};
    behaviors[behaviorId] = behavior;
    chrome.storage.local.set({ wss_behaviors: behaviors }, () => {
      sendResponse({ success: true, behavior });
    });
  });
}

function getBehaviors(sendResponse) {
  chrome.storage.local.get(['wss_behaviors'], (result) => {
    const behaviors = result.wss_behaviors || {};
    const list = Object.values(behaviors).sort((a, b) => b.updatedAt - a.updatedAt);
    sendResponse({ success: true, behaviors: list });
  });
}

function getBehavior(payload, sendResponse) {
  if (!payload?.behaviorId) {
    sendResponse({ success: false, error: '行为ID不能为空' });
    return;
  }
  chrome.storage.local.get(['wss_behaviors'], (result) => {
    const behaviors = result.wss_behaviors || {};
    const behavior = behaviors[payload.behaviorId];
    sendResponse(behavior ? { success: true, behavior } : { success: false, error: '行为不存在' });
  });
}

function updateBehavior(payload, sendResponse) {
  if (!payload?.behaviorId) {
    sendResponse({ success: false, error: '行为ID不能为空' });
    return;
  }
  chrome.storage.local.get(['wss_behaviors'], (result) => {
    const behaviors = result.wss_behaviors || {};
    if (!behaviors[payload.behaviorId]) {
      sendResponse({ success: false, error: '行为不存在' });
      return;
    }
    const existing = behaviors[payload.behaviorId];
    behaviors[payload.behaviorId] = {
      ...existing,
      name: payload.name ?? existing.name,
      description: payload.description ?? existing.description,
      url: payload.url ?? existing.url,
      messages: payload.messages ?? existing.messages,
      cookies: payload.cookies ?? existing.cookies,
      connectionId: payload.connectionId ?? existing.connectionId,  // 保留连接ID
      replayCount: payload.replayCount ?? existing.replayCount,  // 保留回放次数
      replayInterval: payload.replayInterval ?? existing.replayInterval,  // 保留回放间隔
      updatedAt: Date.now()
    };
    chrome.storage.local.set({ wss_behaviors: behaviors }, () => {
      sendResponse({ success: true, behavior: behaviors[payload.behaviorId] });
    });
  });
}

function deleteBehavior(payload, sendResponse) {
  if (!payload?.behaviorId) {
    sendResponse({ success: false, error: '行为ID不能为空' });
    return;
  }
  chrome.storage.local.get(['wss_behaviors'], (result) => {
    const behaviors = result.wss_behaviors || {};
    delete behaviors[payload.behaviorId];
    chrome.storage.local.set({ wss_behaviors: behaviors }, () => {
      sendResponse({ success: true });
    });
  });
}

function replayBehavior(payload, sendResponse) {
  console.log('[Replay] replayBehavior called with:', payload);
  
  chrome.storage.local.get(['wss_behaviors'], (result) => {
    const behaviors = result.wss_behaviors || {};
    const behavior = behaviors[payload.behaviorId];
    if (!behavior) {
      sendResponse({ success: false, error: '行为不存在' });
      return;
    }

    const messagePayload = {
      type: 'REPLAY_BEHAVIOR',
      payload: {
        messages: behavior.messages,
        url: payload.url || behavior.url,
        delay: payload.delay !== undefined ? payload.delay : true, // 默认启用时间间隔
        cookies: payload.cookies || behavior.cookies || '',
        repeatCount: Math.max(1, Math.min(100, Number(payload.repeatCount) || 1))
      }
    };

    console.log('[Replay] Replay payload:', messagePayload);

    // 只发送到当前活动的标签页
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) {
        sendResponse({ success: false, error: '没有活动的标签页' });
        return;
      }
      
      const activeTabId = tabs[0].id;
      const activeTabUrl = tabs[0].url;
      
      console.log('[Replay] Sending replay to active tab:', activeTabId);
      
      // 直接发送到当前活动标签页
      chrome.tabs.sendMessage(activeTabId, messagePayload, (response) => {
        // 检查是否有错误
        if (chrome.runtime.lastError) {
          console.error('[Replay] Error sending to active tab:', chrome.runtime.lastError.message);
          sendResponse({ success: false, error: '无法与页面通信: ' + chrome.runtime.lastError.message });
        } else {
          console.log('[Replay] Active tab response:', response);
          sendResponse(response || { success: false, error: 'No response' });
        }
      });
    });
  });
}

// ============================================================
// Utility Functions
// ============================================================

function injectInterceptor(tabId, callback) {
  if (!tabId) {
    callback?.({ success: false, error: 'No tab ID' });
    return;
  }

  chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    files: ['src/content/injected-script.js'],
    world: 'MAIN'
  }).then(() => {
    callback?.({ success: true });
  }).catch(err => {
    console.error('[WSS Recorder] Failed to inject interceptor:', err);
    callback?.({ success: false, error: err.message });
  });
}

// Persist global state to storage for recovery after service worker restart
function persistState() {
  chrome.storage.local.set({
    wss_recorder_state: {
      isRecording: globalState.isRecording,
      currentSessionId: globalState.currentSessionId,
      recordStartTime: globalState.recordStartTime,
      updatedAt: Date.now()
    }
  });
}

// Restore state from storage on service worker startup
// (Already handled by initAndRestoreState at the top of the file)

// Query current recording state (for popup verification)
function getRecordingState(sendResponse) {
  const session = globalState.currentSessionId ? activeSessions.get(globalState.currentSessionId) : null;
  sendResponse({
    isRecording: globalState.isRecording,
    sessionId: globalState.currentSessionId,
    messageCount: session ? session.messageCount : 0
  });
}

function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateConnectionId() {
  return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function detectDataType(data) {
  if (typeof data === 'string') {
    try { JSON.parse(data); return 'json'; } catch { return 'text'; }
  }
  if (data instanceof ArrayBuffer || data instanceof Blob) return 'binary';
  return 'unknown';
}

// ============================================================
// Lifecycle Events
// ============================================================

chrome.tabs.onRemoved.addListener((tabId) => {
  tabConnections.delete(tabId);
});

console.log('[WSS Recorder] Background service worker initialized');
