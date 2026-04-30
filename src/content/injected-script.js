/**
 * Injected script running in MAIN world.
 * Intercepts outgoing WebSocket messages and executes replay commands.
 */

(function() {
  'use strict';

  if (window.__wss_recorder_installed) return;
  window.__wss_recorder_installed = true;

  var RECORDER_EVENT = '__wss_recorder';
  var REPLAY_COMMAND_EVENT = '__wss_replay_command';
  var REPLAY_RESULT_EVENT = '__wss_replay_result';

  var OriginalWebSocket = window.WebSocket || globalThis.WebSocket;
  if (!OriginalWebSocket) return;

  if (!window.__wssInstances) window.__wssInstances = new Map();

  var origSend = OriginalWebSocket.prototype.send;

  var replayState = {
    running: false,
    stopRequested: false,
    sockets: new Map(),
    createdSocketKeys: new Set()
  };

  // 页面 WebSocket 连接注册表（用于回放时广播消息）
  var pageWebSocketRegistry = new Map(); // connectionId -> WebSocket 实例

  // 监听来自 content-script 的连接查询请求（跨 world 通信）
  document.addEventListener('wss_get_connections', function(event) {
    try {
      const requestId = event.detail && event.detail.requestId;
      if (!requestId) return;
      
      const instances = window.__wssInstances || new Map();
      const connections = [];
      
      instances.forEach((ws, connectionId) => {
        connections.push({
          connectionId: connectionId,
          url: ws.url || '',
          status: ws.readyState === OriginalWebSocket.OPEN ? 'open' : 
                  ws.readyState === OriginalWebSocket.CONNECTING ? 'connecting' : 'closed',
          protocols: ws.__wssProtocols || []
        });
      });
      
      // 发送响应回 content-script
      const responseEvent = new CustomEvent('wss_connections_response', {
        detail: {
          requestId: requestId,
          success: true,
          connections: connections
        }
      });
      document.dispatchEvent(responseEvent);
    } catch (error) {
      const errorEvent = new CustomEvent('wss_connections_response', {
        detail: {
          requestId: event.detail && event.detail.requestId,
          success: false,
          error: error.message
        }
      });
      document.dispatchEvent(errorEvent);
    }
  });

  function normalizeUrl(url) {
    if (!url) return '';
    return String(url)
      .replace(/^http:/, 'ws:')
      .replace(/^https:/, 'wss:');
  }

  function generateConnectionId() {
    return 'conn_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11);
  }

  function normalizeProtocols(protocols) {
    if (Array.isArray(protocols)) return protocols.filter(Boolean);
    if (typeof protocols === 'string' && protocols) return [protocols];
    return [];
  }

  function dispatchRecorderEvent(eventName, data) {
    try {
      window.dispatchEvent(new CustomEvent(RECORDER_EVENT, {
        detail: {
          __wss_recorder: true,
          event: eventName,
          data: data
        }
      }));
    } catch (e) {}
  }

  function dispatchReplayResult(requestId, result) {
    try {
      window.dispatchEvent(new CustomEvent(REPLAY_RESULT_EVENT, {
        detail: {
          __wss_replay: true,
          requestId: requestId,
          result: result
        }
      }));
    } catch (e) {}
  }

  function sleep(ms) {
    return new Promise(function(resolve) { setTimeout(resolve, ms); });
  }

  function waitForOpen(ws, timeoutMs) {
    return new Promise(function(resolve, reject) {
      var settled = false;
      var timer = setTimeout(function() {
        if (settled) return;
        settled = true;
        reject(new Error('WebSocket open timeout'));
      }, timeoutMs || 10000);

      ws.addEventListener('open', function onOpen() {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve();
      }, { once: true });

      ws.addEventListener('error', function onError() {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(new Error('WebSocket connection error'));
      }, { once: true });
    });
  }

  function applyCookies(cookieHeader) {
    if (!cookieHeader || typeof cookieHeader !== 'string') return 0;

    var applied = 0;
    cookieHeader.split(';').forEach(function(part) {
      var segment = (part || '').trim();
      if (!segment) return;

      var eqIndex = segment.indexOf('=');
      if (eqIndex <= 0) return;

      var name = segment.slice(0, eqIndex).trim();
      var value = segment.slice(eqIndex + 1).trim();
      if (!name) return;

      try {
        document.cookie = name + '=' + value + '; path=/';
        applied += 1;
      } catch (err) {}
    });

    return applied;
  }

  function bytesToBase64(bytes) {
    var binary = '';
    var chunkSize = 0x8000;

    for (var i = 0; i < bytes.length; i += chunkSize) {
      var chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk);
    }

    return btoa(binary);
  }

  function base64ToUint8Array(base64) {
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);

    for (var i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
  }

  function toByteArray(data) {
    if (data instanceof Uint8Array) return data;
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    if (ArrayBuffer.isView(data)) {
      return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    }
    return null;
  }

  function toReplayPayload(message) {
    var msg = message || {};
    var replayData = msg.replayData || msg.rawData;

    if (replayData && replayData.format === 'binary-base64' && replayData.value) {
      return base64ToUint8Array(replayData.value).buffer;
    }

    if (replayData && replayData.format === 'text') {
      return String(replayData.value || '');
    }

    var value = msg;
    if (msg && typeof msg === 'object' && Object.prototype.hasOwnProperty.call(msg, 'data')) {
      value = msg.data;
    }

    if (typeof value === 'string') return value;
    if (value === null || value === undefined) return '';

    try {
      return JSON.stringify(value);
    } catch (err) {
      return String(value);
    }
  }

  function getFirstOpenSocket() {
    var values = window.__wssInstances.values();
    var current = values.next();

    while (!current.done) {
      var ws = current.value;
      if (ws && ws.readyState === OriginalWebSocket.OPEN) {
        return ws;
      }
      current = values.next();
    }

    return null;
  }

  function findOpenSocket(connectionId, targetUrl, allowAnyOpen) {
    if (connectionId && window.__wssInstances.has(connectionId)) {
      var byId = window.__wssInstances.get(connectionId);
      if (byId && byId.readyState === OriginalWebSocket.OPEN) {
        return byId;
      }
    }

    var normalizedTarget = normalizeUrl(targetUrl);
    if (normalizedTarget) {
      var values = window.__wssInstances.values();
      var current = values.next();

      while (!current.done) {
        var ws = current.value;
        if (ws && ws.readyState === OriginalWebSocket.OPEN && normalizeUrl(ws.url) === normalizedTarget) {
          return ws;
        }
        current = values.next();
      }
    }

    if (allowAnyOpen) {
      return getFirstOpenSocket();
    }

    return null;
  }

  async function openReplaySocket(wsUrl, cookies, protocols) {
    if (!wsUrl) {
      throw new Error('No WebSocket URL provided for replay');
    }

    console.log('[InjectedScript] openReplaySocket called with URL:', wsUrl);

    applyCookies(cookies || '');

    var protocolList = normalizeProtocols(protocols);
    console.log('[InjectedScript] Protocols:', protocolList);
    
    // 使用 OriginalWebSocket 直接创建，不经过拦截器
    var ws = protocolList.length > 0
      ? new OriginalWebSocket(wsUrl, protocolList)
      : new OriginalWebSocket(wsUrl);
    
    console.log('[InjectedScript] WebSocket object created, readyState:', ws.readyState, '(0=CONNECTING, 1=OPEN)');
    
    // 标记为回放连接，避免被录制器捕获
    ws.__wssIsReplay = true;

    // 增加超时时间到 10 秒，确保连接有足够时间建立
    console.log('[InjectedScript] Waiting for WebSocket to open (timeout: 10s)...');
    try {
      await waitForOpen(ws, 10000);
      console.log('[InjectedScript] WebSocket opened successfully, readyState:', ws.readyState);
    } catch (error) {
      console.error('[InjectedScript] WebSocket failed to open:', error.message, 'readyState:', ws.readyState);
      throw error;
    }
    
    return ws;
  }

  function getReplaySocketKey(message) {
    if (message && message.connectionId) return 'conn:' + message.connectionId;

    var url = normalizeUrl((message && message.url) || '');
    if (url) return 'url:' + url;

    return 'default';
  }

  function stopReplay() {
    replayState.stopRequested = true;

    replayState.createdSocketKeys.forEach(function(key) {
      var ws = replayState.sockets.get(key);
      if (!ws) return;

      try {
        if (ws.readyState === OriginalWebSocket.OPEN || ws.readyState === OriginalWebSocket.CONNECTING) {
          ws.close(1000, 'Replay stopped');
        }
      } catch (e) {}
    });
  }

  async function runSingleSend(command) {
    var replayUrl = command.url || (command.message && command.message.url) || '';
    var replayProtocols = command.protocols || (command.message && command.message.protocols) || [];

    var ws = findOpenSocket(command.connectionId, replayUrl, true);
    var createdConnection = false;

    if (!ws) {
      ws = await openReplaySocket(replayUrl, command.cookies, replayProtocols);
      createdConnection = true;
    }

    if (!ws || ws.readyState !== OriginalWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }

    var payload = toReplayPayload(command.message);
    origSend.call(ws, payload);

    if (createdConnection) {
      try { ws.close(1000, 'Replay single message complete'); } catch (e) {}
    }

    return { success: true, sent: 1, messageCount: 1 };
  }

  async function waitWithStop(ms) {
    var remaining = Math.max(0, Number(ms) || 0);
    
    // 对于小于 100ms 的间隔，直接使用 setTimeout 保证精度
    if (remaining < 100) {
      if (remaining > 0) {
        await sleep(remaining);
      }
      return !replayState.stopRequested;
    }
    
    // 对于大于等于 100ms 的间隔，分段检查停止信号
    while (remaining > 0) {
      if (replayState.stopRequested) return false;
      var chunk = Math.min(remaining, 100);
      await sleep(chunk);
      remaining -= chunk;
    }
    return !replayState.stopRequested;
  }

  async function ensureReplaySocketForMessage(message, command) {
    var key = getReplaySocketKey(message);
    var ws = replayState.sockets.get(key);

    if (ws && ws.readyState === OriginalWebSocket.OPEN) {
      return { key: key, ws: ws };
    }

    // Try to find existing open socket - reuse connections instead of creating new ones
    ws = findOpenSocket(message.connectionId, message.url || command.url, false);
    if (ws) {
      replayState.sockets.set(key, ws);
      return { key: key, ws: ws };
    }

    // If no existing connection found, try to create one (but with shorter timeout)
    var replayUrl = message.url || command.url;
    if (!replayUrl) {
      throw new Error('No WebSocket URL available for replay');
    }

    var replayProtocols = message.protocols || command.protocols || [];
    ws = await openReplaySocket(replayUrl, command.cookies, replayProtocols);

    replayState.sockets.set(key, ws);
    replayState.createdSocketKeys.add(key);

    return { key: key, ws: ws };
  }

  async function runReplaySequence(command) {
    var messages = Array.isArray(command.messages) ? command.messages : [];
    if (messages.length === 0) {
      return { success: false, error: 'No replay messages provided' };
    }

    console.log('[InjectedScript] runReplaySequence started:', {
      messageCount: messages.length,
      url: command.url,
      repeatCount: command.repeatCount,
      delay: command.delay
    });

    replayState.running = true;
    replayState.stopRequested = false;
    replayState.sockets = new Map();
    replayState.createdSocketKeys = new Set();

    if (command.cookies) {
      applyCookies(command.cookies);
    }

    var sent = 0;
    var roundCount = Math.max(1, Number(command.repeatCount) || 1);

    try {
      // 获取页面中所有打开的 WebSocket 连接
      const activeConnections = Array.from(pageWebSocketRegistry.values())
        .filter(ws => ws.readyState === OriginalWebSocket.OPEN);

      console.log(`[InjectedScript] Found ${activeConnections.length} active WebSocket connections on page`);

      if (activeConnections.length === 0) {
        console.error('[InjectedScript] No active WebSocket connections found on page');
        return {
          success: false,
          error: '页面上没有活动的 WebSocket 连接，请先打开目标页面并建立连接',
          sent: 0,
          messageCount: 0,
          connectionCount: 0
        };
      }

      // 并发执行每轮回放
      for (var roundIndex = 0; roundIndex < roundCount; roundIndex++) {
        if (replayState.stopRequested) {
          return { success: false, error: 'Replay stopped by user', sent: sent, messageCount: sent, roundCount: roundCount };
        }

        console.log(`[InjectedScript] Round ${roundIndex + 1}/${roundCount} started`);

        // 每个连接并发发送所有消息
        const connectionPromises = activeConnections.map(async (ws, connIndex) => {
          if (replayState.stopRequested) return;

          const connId = ws.__wssConnectionId || `conn_${connIndex}`;
          console.log(`[InjectedScript] Sending ${messages.length} messages on connection ${connIndex + 1}: ${connId}`);

          // 记录本轮回放的开始时间
          const roundStartTime = Date.now();
          let lastMessageTime = 0;

          // 按顺序发送所有消息
          for (let i = 0; i < messages.length; i++) {
            if (replayState.stopRequested) return;

            const message = messages[i];
            
            // 使用消息的 relativeTime 计算间隔
            var currentMessageTime = Number(message.relativeTime) || 0;
            var waitMs = 0;
            
            if (command.delay !== false && messages.length > 1) {
              // 使用消息序列的实际时间间隔
              if (i === 0) {
                // 第一条消息：等待它的 relativeTime
                waitMs = currentMessageTime;
              } else {
                // 后续消息：等待与上一条消息的时间差
                var prevMessageTime = Number(messages[i - 1].relativeTime) || 0;
                waitMs = Math.max(0, currentMessageTime - prevMessageTime);
              }
            }

            if (waitMs > 0) {
              var shouldContinue = await waitWithStop(waitMs);
              if (!shouldContinue) return;
            }

            var payload = toReplayPayload(message);
            origSend.call(ws, payload);
            sent += 1;
            lastMessageTime = currentMessageTime;

            console.log(`[InjectedScript] [Conn ${connIndex + 1}] Sent message ${i + 1}/${messages.length} (delay: ${waitMs}ms, relativeTime: ${currentMessageTime}ms)`);
          }
        });

        // 等待所有连接完成本轮回放
        await Promise.all(connectionPromises);
        console.log(`[InjectedScript] Round ${roundIndex + 1} completed`);
      }

      console.log('[InjectedScript] runReplaySequence completed:', { sent, roundCount, connectionCount: activeConnections.length });

      return {
        success: true,
        sent: sent,
        messageCount: sent,
        connectionCount: activeConnections.length,
        roundCount: roundCount
      };
    } finally {
      replayState.running = false;

      replayState.createdSocketKeys.forEach(function(key) {
        var ws = replayState.sockets.get(key);
        if (!ws) return;

        try {
          if (ws.readyState === OriginalWebSocket.OPEN || ws.readyState === OriginalWebSocket.CONNECTING) {
            ws.close(1000, 'Replay finished');
          }
        } catch (e) {}
      });
    }
  }

  function handleReplayCommandEvent(e) {
    var detail = e.detail;
    if (!detail || !detail.__wss_replay || !detail.requestId) return;

    var requestId = detail.requestId;
    var command = detail.command || {};
    var action = command.action;

    if (action === 'stop-replay') {
      stopReplay();
      dispatchReplayResult(requestId, { success: true, stopped: true });
      return;
    }

    if (action === 'send-message') {
      runSingleSend(command)
        .then(function(result) {
          dispatchReplayResult(requestId, result);
        })
        .catch(function(err) {
          dispatchReplayResult(requestId, { success: false, error: err.message || String(err) });
        });
      return;
    }

    if (action === 'replay-sequence') {
      console.log('[InjectedScript] Starting replay-sequence:', {
        messageCount: command.messages?.length || 0,
        url: command.url,
        repeatCount: command.repeatCount,
        delay: command.delay
      });
      runReplaySequence(command)
        .then(function(result) {
          console.log('[InjectedScript] Replay-sequence completed:', result);
          dispatchReplayResult(requestId, result);
        })
        .catch(function(err) {
          console.error('[InjectedScript] Replay-sequence failed:', err);
          dispatchReplayResult(requestId, { success: false, error: err.message || String(err) });
        });
      return;
    }

    dispatchReplayResult(requestId, { success: false, error: 'Unknown replay action: ' + action });
  }

  var CTRL_NAMES = [
    'NUL', 'SOH', 'STX', 'ETX', 'EOT', 'ENQ', 'ACK', 'BEL', 'BS', 'HT', 'LF', 'VT', 'FF', 'CR', 'SO', 'SI',
    'DLE', 'DC1', 'DC2', 'DC3', 'DC4', 'NAK', 'SYN', 'ETB', 'CAN', 'EM', 'SUB', 'ESC', 'FS', 'GS', 'RS', 'US', 'SP'
  ];

  function bufferToHex(data) {
    var bytes = toByteArray(data);
    if (!bytes) return '';

    var result = '';
    var maxLen = Math.min(bytes.length, 512);

    for (var i = 0; i < maxLen; i++) {
      var b = bytes[i];

      if (b < 0x20) {
        result += CTRL_NAMES[b] || '?';
      } else if (b <= 0x7E) {
        result += String.fromCharCode(b);
      } else {
        result += b.toString(16).padStart(2, '0').toUpperCase();
      }
    }

    if (bytes.length > maxLen) {
      result += ' ...(' + bytes.length + ' bytes)';
    }

    return result;
  }

  window.WebSocket = function(url, protocols) {
    var protocolList = normalizeProtocols(protocols);
    var ws = protocolList.length > 0
      ? new OriginalWebSocket(url, protocolList)
      : new OriginalWebSocket(url);

    var connectionId = generateConnectionId();
    ws.__wssConnectionId = connectionId;
    ws.__wssProtocols = protocolList;
    window.__wssInstances.set(connectionId, ws);
    
    // 注册到页面 WebSocket 注册表（用于回放广播）
    pageWebSocketRegistry.set(connectionId, ws);
    console.log('[InjectedScript] Registered WebSocket:', connectionId, 'to', url);

    ws.addEventListener('open', function() {
      // 跳过回放连接的录制
      if (ws.__wssIsReplay) {
        return;
      }
      
      var cookies = '';
      try { cookies = document.cookie || ''; } catch (e) {}

      dispatchRecorderEvent('open', {
        connectionId: connectionId,
        url: normalizeUrl(url) || '',
        protocols: protocolList,
        cookies: cookies,
        timestamp: Date.now()
      });
    });

    ws.addEventListener('close', function(event) {
      // 跳过回放连接的录制
      if (ws.__wssIsReplay) {
        return;
      }
      
      // 从页面注册表中移除
      pageWebSocketRegistry.delete(connectionId);
      console.log('[InjectedScript] Unregistered WebSocket:', connectionId);
      
      dispatchRecorderEvent('close', {
        connectionId: connectionId,
        url: normalizeUrl(url) || '',
        code: event.code,
        reason: event.reason,
        timestamp: Date.now()
      });

      window.__wssInstances.delete(connectionId);
    });

    ws.addEventListener('error', function() {
      // 跳过回放连接的录制
      if (ws.__wssIsReplay) {
        return;
      }
      
      dispatchRecorderEvent('error', {
        connectionId: connectionId,
        url: normalizeUrl(url) || '',
        timestamp: Date.now()
      });
    });

    // 移除 receive 事件监听，不录制服务器响应
    // ws.addEventListener('message', ...);

    return ws;
  };

  window.WebSocket.prototype = OriginalWebSocket.prototype;
  window.WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
  window.WebSocket.OPEN = OriginalWebSocket.OPEN;
  window.WebSocket.CLOSING = OriginalWebSocket.CLOSING;
  window.WebSocket.CLOSED = OriginalWebSocket.CLOSED;

  OriginalWebSocket.prototype.send = function(data) {
    // 跳过回放连接的录制
    if (this.__wssIsReplay) {
      return origSend.call(this, data);
    }
    
    var connectionId = this.__wssConnectionId || '';
    var protocols = this.__wssProtocols || [];
    var normalizedUrl = normalizeUrl(this.url) || '';

    var byteArray = toByteArray(data);
    var actualSize = 0;
    var dataStr = '';
    var dataType = 'unknown';
    var replayData = null;

    if (typeof data === 'string') {
      dataStr = data;
      dataType = 'text';
      replayData = { format: 'text', value: data };
      try {
        JSON.parse(data);
        dataType = 'json';
      } catch (e) {}
      actualSize = data.length;
    } else if (typeof data === 'number' || typeof data === 'boolean') {
      dataStr = String(data);
      dataType = 'primitive';
      replayData = { format: 'text', value: dataStr };
      actualSize = dataStr.length;
    } else if (byteArray) {
      dataStr = bufferToHex(byteArray);
      dataType = 'binary';
      actualSize = byteArray.byteLength;
      replayData = {
        format: 'binary-base64',
        value: bytesToBase64(byteArray),
        byteLength: byteArray.byteLength
      };
    } else if (data instanceof Blob) {
      var blobSize = data.size;
      var blobConnId = connectionId;
      var blobUrl = normalizedUrl;
      var blobProtocols = protocols;

      var reader = new FileReader();
      reader.onload = function() {
        var resultBuffer = reader.result;
        var bytes = new Uint8Array(resultBuffer);

        dispatchRecorderEvent('send', {
          connectionId: blobConnId,
          url: blobUrl,
          protocols: blobProtocols,
          data: bufferToHex(bytes),
          dataType: 'binary',
          replayData: {
            format: 'binary-base64',
            value: bytesToBase64(bytes),
            byteLength: bytes.byteLength
          },
          timestamp: Date.now(),
          size: bytes.byteLength
        });
      };
      reader.onerror = function() {
        dispatchRecorderEvent('send', {
          connectionId: blobConnId,
          url: blobUrl,
          protocols: blobProtocols,
          data: '[Blob:' + blobSize + 'bytes]',
          dataType: 'blob',
          replayData: { format: 'unsupported-blob' },
          timestamp: Date.now(),
          size: blobSize
        });
      };
      reader.readAsArrayBuffer(data);

      return origSend.call(this, data);
    } else if (data && typeof data === 'object') {
      try {
        dataStr = JSON.stringify(data);
        dataType = 'json';
      } catch (e) {
        dataStr = String(data);
      }
      replayData = { format: 'text', value: dataStr };
      actualSize = dataStr.length;
    }

    dispatchRecorderEvent('send', {
      connectionId: connectionId,
      url: normalizedUrl,
      protocols: protocols,
      data: dataStr,
      dataType: dataType,
      replayData: replayData,
      timestamp: Date.now(),
      size: actualSize
    });

    return origSend.call(this, data);
  };

  window.addEventListener(REPLAY_COMMAND_EVENT, handleReplayCommandEvent, false);

  console.log('[WSS Recorder] Interceptor installed in MAIN world');
})();
