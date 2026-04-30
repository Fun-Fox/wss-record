/**
 * Popup - 设备群控 WebSocket 录制回放插件
 *
 * 简化提示页面：引导用户在 DevTools 面板中操作
 */

(function() {
  'use strict';

  // State
  let isRecording = false;

  // DOM Elements
  const elements = {
    statusDot: document.getElementById('statusDot'),
    statusText: document.getElementById('statusText')
  };

  // Initialize
  function init() {
    loadState();

    // Listen for updates from background
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'RECORDING_STARTED') {
        isRecording = true;
        saveState();
        updateUI();
      }
      if (message.type === 'RECORDING_STOPPED') {
        isRecording = false;
        saveState();
        updateUI();
      }
    });
  }

  function loadState() {
    chrome.storage.local.get(['wss_recorder_state'], (result) => {
      const state = result.wss_recorder_state || {};
      isRecording = state.isRecording || false;
      updateUI();

      // Verify with background service worker
      chrome.runtime.sendMessage({ type: 'GET_RECORDING_STATE' }, (response) => {
        if (chrome.runtime.lastError) return;
        if (response && response.isRecording !== undefined) {
          if (response.isRecording !== isRecording) {
            isRecording = response.isRecording;
            saveState();
            updateUI();
          }
        }
      });
    });
  }

  function updateUI() {
    if (isRecording) {
      elements.statusDot.className = 'status-dot recording';
      elements.statusText.textContent = '录制中';
    } else {
      elements.statusDot.className = 'status-dot';
      elements.statusText.textContent = '空闲';
    }
  }

  function saveState() {
    chrome.storage.local.set({
      wss_recorder_state: {
        isRecording,
        updatedAt: Date.now()
      }
    });
  }

  init();

})();
