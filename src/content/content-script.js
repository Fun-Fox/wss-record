/**
 * Content Script - bridge between background and MAIN world script.
 */

(function() {
  'use strict';

  if (window.__wss_bridge_installed) return;
  window.__wss_bridge_installed = true;

  var RECORDER_EVENT = '__wss_recorder';
  var REPLAY_COMMAND_EVENT = '__wss_replay_command';
  var REPLAY_RESULT_EVENT = '__wss_replay_result';
  var REPLAY_TIMEOUT_MS = 120000;

  var replayRequests = new Map();

  function injectMainWorldScript() {
    var script = document.createElement('script');
    script.src = chrome.runtime.getURL('src/content/injected-script.js');
    script.onload = function() { script.remove(); };

    var parent = document.head || document.documentElement;
    if (parent.firstChild) {
      parent.insertBefore(script, parent.firstChild);
    } else {
      parent.appendChild(script);
    }
  }

  function forwardRecorderEvent(e) {
    if (!e.detail || !e.detail.__wss_recorder) return;

    var msg = e.detail;
    var eventType = msg.event;
    var payload = msg.data;

    var typeMap = {
      open: 'WS_CONNECTION_OPENED',
      send: 'WS_MESSAGE_CAPTURED',
      // receive: 'WS_MESSAGE_RECEIVED',  // 移除 receive 事件
      close: 'WS_CONNECTION_CLOSED',
      error: 'WS_CONNECTION_ERROR'
    };

    try {
      if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          type: typeMap[eventType] || 'WS_MESSAGE_CAPTURED',
          payload: payload
        });
      }
    } catch (err) {
      if (!err.message || !err.message.includes('Extension context invalidated')) {
        console.warn('[WSS Bridge] Failed to forward recorder event:', err);
      }
    }
  }

  function handleReplayResultEvent(e) {
    var detail = e.detail;
    if (!detail || !detail.__wss_replay || !detail.requestId) return;

    var pending = replayRequests.get(detail.requestId);
    if (!pending) return;

    clearTimeout(pending.timer);
    replayRequests.delete(detail.requestId);

    pending.sendResponse(detail.result || { success: true });
  }

  function dispatchReplayCommand(command, sendResponse) {
    var requestId = 'replay_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    var timeoutMs = REPLAY_TIMEOUT_MS;

    if (command.action === 'replay-sequence' && command.delay !== false && Array.isArray(command.messages)) {
      var repeatCount = Math.max(1, Number(command.repeatCount) || 1);
      var totalDelay = command.messages.reduce(function(sum, msg) {
        return sum + (Number(msg?.delay) || 0);
      }, 0);
      timeoutMs = Math.max(REPLAY_TIMEOUT_MS, totalDelay * repeatCount + 30000);
      timeoutMs = Math.min(timeoutMs, 3600000);
    }

    var timer = setTimeout(function() {
      replayRequests.delete(requestId);
      sendResponse({ success: false, error: 'Replay timed out' });
    }, timeoutMs);

    replayRequests.set(requestId, { sendResponse: sendResponse, timer: timer });

    try {
      window.dispatchEvent(new CustomEvent(REPLAY_COMMAND_EVENT, {
        detail: {
          __wss_replay: true,
          requestId: requestId,
          command: command
        }
      }));
    } catch (err) {
      clearTimeout(timer);
      replayRequests.delete(requestId);
      sendResponse({ success: false, error: err.message || 'Failed to dispatch replay command' });
    }
  }

  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.type === 'GET_WEBSOCKET_CONNECTIONS') {
      // 获取页面中的所有 WebSocket 连接
      // 注意：injected-script 在 MAIN world，content-script 在 ISOLATED world
      // 需要通过 CustomEvent 跨 world 通信
      try {
        const requestId = 'getConn_' + Date.now();
        
        // 监听 injected-script 的响应
        const responseHandler = function(event) {
          if (event.detail && event.detail.requestId === requestId) {
            document.removeEventListener('wss_connections_response', responseHandler);
            sendResponse(event.detail);
          }
        };
        
        document.addEventListener('wss_connections_response', responseHandler);
        
        // 发送请求到 MAIN world
        const requestEvent = new CustomEvent('wss_get_connections', {
          detail: { requestId: requestId }
        });
        document.dispatchEvent(requestEvent);
        
        // 设置超时
        setTimeout(() => {
          document.removeEventListener('wss_connections_response', responseHandler);
          sendResponse({
            success: false,
            error: 'Timeout waiting for connections'
          });
        }, 3000);
        
      } catch (error) {
        sendResponse({
          success: false,
          error: error.message
        });
      }
      return true; // 保持消息通道开放以异步响应
    }

    if (message.type === 'REPLAY_INJECT_MESSAGE') {
      dispatchReplayCommand({
        action: 'send-message',
        message: message.payload?.message,
        connectionId: message.payload?.connectionId,
        url: message.payload?.url || '',
        cookies: message.payload?.cookies || ''
      }, sendResponse);
      return true;
    }

    if (message.type === 'REPLAY_BEHAVIOR') {
      console.log('[ContentScript] Received REPLAY_BEHAVIOR command:', message.payload);
      
      dispatchReplayCommand({
        action: 'replay-sequence',
        messages: message.payload?.messages || [],
        url: message.payload?.url || '',
        delay: message.payload?.delay !== false,
        cookies: message.payload?.cookies || '',
        repeatCount: Math.max(1, Number(message.payload?.repeatCount) || 1)
      }, sendResponse);
      return true;
    }

    if (message.type === 'STOP_REPLAY') {
      dispatchReplayCommand({ action: 'stop-replay' }, sendResponse);
      return true;
    }
  });

  window.addEventListener(RECORDER_EVENT, forwardRecorderEvent, false);
  window.addEventListener(REPLAY_RESULT_EVENT, handleReplayResultEvent, false);

  injectMainWorldScript();
  console.log('[WSS Bridge] Initialized');
})();
