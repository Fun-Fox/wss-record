/**
 * DevTools Panel - WSS Recorder Main Logic
 *
 * Dual-column layout with inline behavior list.
 * Stop recording auto-prompts to save as behavior.
 */

(function() {
  'use strict';

  // ============================================================
  // State
  // ============================================================

  const state = {
    isRecording: false,
    sessionId: null,
    messages: [],
    connections: new Map(),
    selectedMessageId: null,
    selectedConnectionId: null,
    autoScroll: true,
    currentBehaviorId: null,  // For detail modal
    currentBehaviorMessages: [],  // Store messages for estimate calculation
    selectedRecordConnectionId: null,  // 录制时选中的连接ID
    recordingConnectionId: null,  // 正在录制的连接ID（用于高亮显示）
    // 录制过滤设置
    filterSettings: {
      keywords: [],  // 内容过滤关键词
      types: { text: true, json: true, binary: true },  // 消息类型过滤
      urlPattern: ''  // URL 过滤模式
    }
  };

  // ============================================================
  // DOM References
  // ============================================================

  const elements = {
    appContainer: document.getElementById('appContainer'),

    // Status
    statusDot: document.getElementById('statusDot'),
    statusText: document.getElementById('statusText'),
    messageCount: document.getElementById('messageCount'),

    // Toolbar
    btnRecord: document.getElementById('btnRecord'),
    btnStop: document.getElementById('btnStop'),
    btnClear: document.getElementById('btnClear'),

    // Panels
    replayPanel: document.getElementById('replayPanel'),
    btnCloseReplay: document.getElementById('btnCloseReplay'),
    replayBehaviorName: document.getElementById('replayBehaviorName'),
    replayProgressFill: document.getElementById('replayProgressFill'),
    replayProgressText: document.getElementById('replayProgressText'),
    replayLog: document.getElementById('replayLog'),
    replayDetailInfo: document.getElementById('replayDetailInfo'),
    behaviorsList: document.getElementById('behaviorsList'),
    behaviorCount: document.getElementById('behaviorCount'),
    connectionsList: document.getElementById('connectionsList'),
    connectionCount: document.getElementById('connectionCount'),
    messagesBody: document.getElementById('messagesBody'),
    detailContent: document.getElementById('detailContent'),
    btnScrollToBottom: document.getElementById('btnScrollToBottom'),
    btnAutoScroll: document.getElementById('btnAutoScroll'),
    btnCloseDetail: document.getElementById('btnCloseDetail'),

    // Save/Edit Behavior Modal
    saveBehaviorModal: document.getElementById('saveBehaviorModal'),
    btnCloseSaveBehavior: document.getElementById('btnCloseSaveBehavior'),
    btnCancelSaveBehavior: document.getElementById('btnCancelSaveBehavior'),
    btnSaveBehavior: document.getElementById('btnSaveBehavior'),
    behaviorModalTitle: document.getElementById('behaviorModalTitle'),
    editBehaviorId: document.getElementById('editBehaviorId'),
    behaviorName: document.getElementById('behaviorName'),
    behaviorUrl: document.getElementById('behaviorUrl'),
    behaviorConnections: document.getElementById('behaviorConnections'),
    behaviorCookies: document.getElementById('behaviorCookies'),
    behaviorDesc: document.getElementById('behaviorDesc'),

    // Recording Filter Settings Modal
    recordingSettingsModal: document.getElementById('recordingSettingsModal'),
    btnRecordingSettings: document.getElementById('btnRecordingSettings'),
    btnCloseRecordingSettings: document.getElementById('btnCloseRecordingSettings'),
    filterKeyword: document.getElementById('filterKeyword'),
    filterText: document.getElementById('filterText'),
    filterJson: document.getElementById('filterJson'),
    filterBinary: document.getElementById('filterBinary'),
    filterUrlPattern: document.getElementById('filterUrlPattern'),
    btnSaveFilterSettings: document.getElementById('btnSaveFilterSettings'),
    btnResetFilterSettings: document.getElementById('btnResetFilterSettings'),

    // Behavior Detail Modal
    behaviorDetailModal: document.getElementById('behaviorDetailModal'),
    btnCloseBehaviorDetail: document.getElementById('btnCloseBehaviorDetail'),
    behaviorDetailTitle: document.getElementById('behaviorDetailTitle'),
    detailBehaviorName: document.getElementById('detailBehaviorName'),
    detailBehaviorMessages: document.getElementById('detailBehaviorMessages'),
    detailBehaviorDate: document.getElementById('detailBehaviorDate'),
    btnReplayBehavior: document.getElementById('btnReplayBehavior'),
    btnEditBehavior: document.getElementById('btnEditBehavior'),
    btnExportBehavior: document.getElementById('btnExportBehavior'),
    btnImportBehavior: document.getElementById('btnImportBehavior'),
    btnDeleteBehavior: document.getElementById('btnDeleteBehavior'),
    btnSaveReplaySettings: document.getElementById('btnSaveReplaySettings'),
    btnAddMessage: document.getElementById('btnAddMessage'),
    replayRepeatCount: document.getElementById('replayRepeatCount'),
    replayInterval: document.getElementById('replayInterval'),
    replayEstimateTime: document.getElementById('replayEstimateTime'),
    detailCookies: document.getElementById('detailCookies'),
    detailMessages: document.getElementById('detailMessages'),

    // Edit Message Modal
    editMessageModal: document.getElementById('editMessageModal'),
    btnCloseEditMessage: document.getElementById('btnCloseEditMessage'),
    btnCancelEditMessage: document.getElementById('btnCancelEditMessage'),
    btnSaveEditMessage: document.getElementById('btnSaveEditMessage'),
    editMessageTitle: document.getElementById('editMessageTitle'),
    editMessageIndex: document.getElementById('editMessageIndex'),
    editMessageConnId: document.getElementById('editMessageConnId'),
    editMessageUrl: document.getElementById('editMessageUrl'),
    editMessageDataType: document.getElementById('editMessageDataType'),
    editMessageData: document.getElementById('editMessageData'),
    editMessageDelay: document.getElementById('editMessageDelay'),
    
    // Binary format controls
    binaryFormatSelector: document.getElementById('binaryFormatSelector'),
    binarySize: document.getElementById('binarySize'),
    binaryPreview: document.getElementById('binaryPreview'),
    
    // Binary raw preview
    binaryRawPreview: document.getElementById('binaryRawPreview'),
    rawPreviewContent: document.getElementById('rawPreviewContent'),
    btnCopyRawPreview: document.getElementById('btnCopyRawPreview'),

    // Toast
    toast: document.getElementById('toast'),

    // Connection Selection Modal (录制前选择)
    selectConnectionModal: document.getElementById('selectConnectionModal'),
    connectionRadioList: document.getElementById('connectionRadioList'),
    btnConfirmRecord: document.getElementById('btnConfirmRecord'),
    btnCloseSelectConnection: document.getElementById('btnCloseSelectConnection'),
    btnCancelSelectConnection: document.getElementById('btnCancelSelectConnection')
  };

  // ============================================================
  // Initialize
  // ============================================================

  function init() {
    restorePreferences();
    bindEvents();
    loadBehaviors();
    loadFilterSettings();  // Load filter settings from storage
    console.log('[WSS Panel] Initialized');
  }

  // ============================================================
  // Event Bindings
  // ============================================================

  function bindEvents() {
    // Recording controls
    elements.btnRecord.addEventListener('click', startRecording);
    elements.btnStop.addEventListener('click', stopRecording);
    elements.btnClear.addEventListener('click', clearMessages);
    

    // Message table
    elements.btnScrollToBottom.addEventListener('click', scrollToBottom);
    elements.btnAutoScroll.addEventListener('click', toggleAutoScroll);
    elements.btnCloseDetail.addEventListener('click', closeDetail);

    // Save/Edit Behavior Modal
    elements.btnCloseSaveBehavior.addEventListener('click', () => closeModal('saveBehaviorModal'));
    elements.btnCancelSaveBehavior.addEventListener('click', () => closeModal('saveBehaviorModal'));
    elements.btnSaveBehavior.addEventListener('click', saveOrUpdateBehavior);

    // Behavior Detail Modal
    elements.btnCloseBehaviorDetail.addEventListener('click', () => closeModal('behaviorDetailModal'));
    elements.btnReplayBehavior.addEventListener('click', () => {
      if (state.currentBehaviorId) {
        closeModal('behaviorDetailModal');
        startReplayBehavior(state.currentBehaviorId);
      }
    });
    elements.btnEditBehavior.addEventListener('click', () => {
      if (state.currentBehaviorId) {
        closeModal('behaviorDetailModal');
        editBehavior(state.currentBehaviorId);
      }
    });
    elements.btnDeleteBehavior.addEventListener('click', () => {
      if (state.currentBehaviorId) {
        deleteBehavior(state.currentBehaviorId);
        closeModal('behaviorDetailModal');
      }
    });
    elements.btnExportBehavior.addEventListener('click', () => {
      if (state.currentBehaviorId) {
        exportBehaviorConfig(state.currentBehaviorId);
      }
    });
    elements.btnImportBehavior.addEventListener('click', importBehaviorConfig);
    elements.btnSaveReplaySettings.addEventListener('click', saveReplaySettings);
    elements.btnAddMessage.addEventListener('click', () => {
      openAddMessageDialog();
    });
    
    // 实时更新回放估算时间
    if (elements.replayRepeatCount) {
      elements.replayRepeatCount.addEventListener('input', updateReplayEstimate);
    }
    if (elements.replayInterval) {
      elements.replayInterval.addEventListener('input', updateReplayEstimate);
    }

    // Edit Message Modal
    elements.btnCloseEditMessage.addEventListener('click', () => closeModal('editMessageModal'));
    elements.btnCancelEditMessage.addEventListener('click', () => closeModal('editMessageModal'));
    elements.btnSaveEditMessage.addEventListener('click', saveEditedMessage);
    
    // Real-time preview update for binary data
    elements.editMessageData.addEventListener('input', () => {
      if (elements.editMessageDataType.value === 'binary') {
        updateBinaryPreview();
      }
    });
    
    // Binary format toggle
    elements.editMessageDataType.addEventListener('change', handleDataTypeChange);
    if (elements.binaryFormatSelector) {
      elements.binaryFormatSelector.querySelectorAll('.btn-icon-btn-sm').forEach(btn => {
        btn.addEventListener('click', () => {
          elements.binaryFormatSelector.querySelectorAll('.btn-icon-btn-sm').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          convertBinaryFormat(btn.dataset.format);
        });
      });
    }
    
    // Copy raw preview
    if (elements.btnCopyRawPreview) {
      elements.btnCopyRawPreview.addEventListener('click', () => {
        const content = elements.rawPreviewContent.textContent;
        navigator.clipboard.writeText(content).then(() => {
          showToast('已复制', 'success');
        }).catch(() => {
          showToast('复制失败', 'error');
        });
      });
    }

    // Connection Selection Modal
    if (elements.btnConfirmRecord) {
      elements.btnConfirmRecord.addEventListener('click', confirmStartRecording);
    }
    if (elements.btnCloseSelectConnection) {
      elements.btnCloseSelectConnection.addEventListener('click', () => closeModal('selectConnectionModal'));
    }
    if (elements.btnCancelSelectConnection) {
      elements.btnCancelSelectConnection.addEventListener('click', () => closeModal('selectConnectionModal'));
    }

    // Recording Filter Settings Modal
    if (elements.btnRecordingSettings) {
      elements.btnRecordingSettings.addEventListener('click', openRecordingSettingsModal);
    }
    if (elements.btnCloseRecordingSettings) {
      elements.btnCloseRecordingSettings.addEventListener('click', () => closeModal('recordingSettingsModal'));
    }
    if (elements.btnSaveFilterSettings) {
      elements.btnSaveFilterSettings.addEventListener('click', saveFilterSettings);
    }
    if (elements.btnResetFilterSettings) {
      elements.btnResetFilterSettings.addEventListener('click', resetFilterSettings);
    }

    // Replay Panel
    elements.btnCloseReplay.addEventListener('click', () => {
      elements.replayPanel.style.display = 'none';
    });

    // Runtime messages from background
    chrome.runtime.onMessage.addListener(handleRuntimeMessage);
  }

  // ============================================================
  // Runtime Message Handler
  // ============================================================

  function handleRuntimeMessage(message, sender, sendResponse) {
    const { type, payload } = message;

    switch (type) {
      case 'NEW_MESSAGE':
        addMessage(payload);
        break;

      case 'CONNECTION_UPDATE':
        updateConnection(payload);
        break;

      case 'RECORDING_STARTED':
        state.isRecording = true;
        state.sessionId = payload.sessionId;
        updateRecordingUI(true);
        break;

      case 'RECORDING_STOPPED':
        state.isRecording = false;
        updateRecordingUI(false);
        // Auto-prompt to save as behavior
        const msgCount = payload.messageCount || state.messages.length;
        if (msgCount > 0) {
          showToast('录制停止，捕获 ' + msgCount + ' 条消息', 'success');
          setTimeout(() => openModalForCreate(), 500);
        } else {
          showToast('录制停止，未捕获消息', 'success');
        }
        break;
    }
  }

  // ============================================================
  // Recording Control
  // ============================================================

  function startRecording() {
    // 显示连接选择模态框
    showConnectionSelectionModal();
  }

  function showConnectionSelectionModal() {
    // 清除之前的选择
    state.selectedRecordConnectionId = null;
    
    // 获取当前页面的所有 WebSocket 连接
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        showToast('No active tab found', 'error');
        return;
      }

      const tabId = tabs[0].id;

      // 通过 content script 获取页面中的 WebSocket 连接
      chrome.tabs.sendMessage(tabId, {
        type: 'GET_WEBSOCKET_CONNECTIONS'
      }, (response) => {
        if (response && response.success && response.connections && response.connections.length > 0) {
          renderConnectionRadioList(response.connections);
          openModal('selectConnectionModal');
        } else {
          showToast('当前页面没有活动的 WebSocket 连接，请先打开目标页面', 'error');
        }
      });
    });
  }

  function renderConnectionRadioList(connections) {
    const container = elements.connectionRadioList;
    container.innerHTML = '';

    connections.forEach((conn, index) => {
      const item = document.createElement('div');
      item.className = 'connection-radio-item';
      item.dataset.connectionId = conn.connectionId;

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'recordConnection';
      radio.value = conn.connectionId;
      radio.id = `conn_radio_${index}`;

      const content = document.createElement('div');
      content.className = 'connection-radio-content';

      const url = document.createElement('div');
      url.className = 'connection-radio-url';
      url.textContent = conn.url || 'Unknown URL';

      const meta = document.createElement('div');
      meta.className = 'connection-radio-meta';

      const status = document.createElement('span');
      status.className = 'connection-radio-status';
      status.textContent = conn.status === 'open' ? '● 已连接' : '○ 未连接';

      const protocol = document.createElement('span');
      protocol.className = 'connection-radio-protocol';
      protocol.textContent = conn.protocols && conn.protocols.length > 0 
        ? `协议: ${conn.protocols.join(', ')}` 
        : '';

      meta.appendChild(status);
      if (protocol.textContent) {
        meta.appendChild(protocol);
      }

      content.appendChild(url);
      content.appendChild(meta);

      item.appendChild(radio);
      item.appendChild(content);

      // 点击整个项选择
      item.addEventListener('click', () => {
        radio.checked = true;
        document.querySelectorAll('.connection-radio-item').forEach(el => el.classList.remove('selected'));
        item.classList.add('selected');
        state.selectedRecordConnectionId = conn.connectionId;
        elements.btnConfirmRecord.disabled = false;
      });

      container.appendChild(item);
    });

    // 默认选中第一个
    if (connections.length > 0) {
      const firstRadio = container.querySelector('input[type="radio"]');
      if (firstRadio) {
        firstRadio.checked = true;
        const firstItem = firstRadio.closest('.connection-radio-item');
        if (firstItem) {
          firstItem.classList.add('selected');
          state.selectedRecordConnectionId = connections[0].connectionId;
          elements.btnConfirmRecord.disabled = false;
        }
      }
    }
  }

  function confirmStartRecording() {
    if (!state.selectedRecordConnectionId) {
      showToast('请选择一个 WebSocket 连接', 'error');
      return;
    }

    closeModal('selectConnectionModal');

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        showToast('No active tab found', 'error');
        return;
      }

      const tab = tabs[0];
      const sessionId = 'session_' + Date.now();

      chrome.runtime.sendMessage({
        type: 'START_RECORDING',
        payload: {
          sessionId,
          tabId: tab.id,
          url: tab.url,
          filterConnectionId: state.selectedRecordConnectionId,  // 传递要录制的连接ID
          filterSettings: state.filterSettings,  // 传递过滤设置
          metadata: {
            pageTitle: tab.title,
            pageUrl: tab.url,
            recordConnectionId: state.selectedRecordConnectionId
          }
        }
      }, (response) => {
        if (response && response.success) {
          state.isRecording = true;
          state.sessionId = sessionId;
          state.recordingConnectionId = state.selectedRecordConnectionId;  // 保存正在录制的连接ID
          updateRecordingUI(true);
          renderConnections();  // 重新渲染连接列表以显示高亮
          showToast('开始录制', 'success');
        } else {
          showToast('启动录制失败', 'error');
        }
      });
    });
  }

  // ============================================================
  // Recording Filter Settings
  // ============================================================

  function openRecordingSettingsModal() {
    // Load current filter settings into the form
    elements.filterKeyword.value = state.filterSettings.keywords.join(', ');
    elements.filterText.checked = state.filterSettings.types.text;
    elements.filterJson.checked = state.filterSettings.types.json;
    elements.filterBinary.checked = state.filterSettings.types.binary;
    elements.filterUrlPattern.value = state.filterSettings.urlPattern || '';
    
    openModal('recordingSettingsModal');
  }

  function saveFilterSettings() {
    // Parse keywords from input
    const keywordInput = elements.filterKeyword.value.trim();
    const keywords = keywordInput ? keywordInput.split(',').map(k => k.trim()).filter(k => k.length > 0) : [];
    
    // Update filter settings
    state.filterSettings = {
      keywords: keywords,
      types: {
        text: elements.filterText.checked,
        json: elements.filterJson.checked,
        binary: elements.filterBinary.checked
      },
      urlPattern: elements.filterUrlPattern.value.trim()
    };
    
    // Save to chrome.storage for persistence across sessions
    chrome.storage.local.set({ recordingFilterSettings: state.filterSettings }, () => {
      console.log('[Panel] Filter settings saved:', state.filterSettings);
      showToast('过滤设置已保存', 'success');
      closeModal('recordingSettingsModal');
    });
  }

  function resetFilterSettings() {
    // Reset to default settings
    state.filterSettings = {
      keywords: [],
      types: { text: true, json: true, binary: true },
      urlPattern: ''
    };
    
    // Update form fields
    elements.filterKeyword.value = '';
    elements.filterText.checked = true;
    elements.filterJson.checked = true;
    elements.filterBinary.checked = true;
    elements.filterUrlPattern.value = '';
    
    // Clear from storage
    chrome.storage.local.remove('recordingFilterSettings', () => {
      console.log('[Panel] Filter settings reset to defaults');
      showToast('已重置为默认设置', 'success');
    });
  }

  function loadFilterSettings() {
    // Load filter settings from storage on startup
    chrome.storage.local.get(['recordingFilterSettings'], (result) => {
      if (result.recordingFilterSettings) {
        state.filterSettings = result.recordingFilterSettings;
        console.log('[Panel] Loaded filter settings:', state.filterSettings);
      }
    });
  }

  function stopRecording() {
    chrome.runtime.sendMessage({
      type: 'STOP_RECORDING',
      payload: { sessionId: state.sessionId }
    }, (response) => {
      if (response && response.success) {
        state.isRecording = false;
        // 注意：不要清除 recordingConnectionId，因为停止录制后还需要它来过滤保存行为的消息
        // state.recordingConnectionId = null;  // 删除这行
        updateRecordingUI(false);
        renderConnections();  // 重新渲染连接列表以移除高亮
      }
    });
  }

  function updateRecordingUI(recording) {
    elements.btnRecord.disabled = recording;
    elements.btnStop.disabled = !recording;

    if (recording) {
      elements.statusDot.className = 'status-dot recording';
      elements.statusText.textContent = '录制中';
      elements.statusText.style.color = 'var(--accent-red)';
    } else {
      elements.statusDot.className = 'status-dot stopped';
      elements.statusText.textContent = '已停止';
      elements.statusText.style.color = 'var(--accent-green)';
    }
  }

  // ============================================================
  // Message Management
  // ============================================================

  function addMessage(message) {
    state.messages.push({
      ...message,
      id: state.messages.length
    });

    // Increment connection message count
    let conn = state.connections.get(message.connectionId);
    if (!conn) {
      conn = {
        connectionId: message.connectionId,
        url: message.url || '',
        status: 'open',
        messageCount: 0,
        createdAt: Date.now()
      };
      state.connections.set(message.connectionId, conn);
    }
    conn.messageCount = (conn.messageCount || 0) + 1;
    renderConnections();

    elements.messageCount.textContent = `${state.messages.length} 条消息`;
    appendMessageRow(message);

    if (state.autoScroll) {
      scrollToBottom();
    }
  }

  function appendMessageRow(message) {
    const tr = document.createElement('tr');
    tr.dataset.messageId = message.id;
    tr.dataset.connectionId = message.connectionId;

    const time = new Date(message.timestamp).toLocaleTimeString('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3  // 显示毫秒
    });

    // 计算与上一条消息的间隔 - 使用数组中实际的前一条消息
    let intervalText = '-';
    let intervalClass = '';
    const messageIndex = state.messages.length - 1;  // 刚添加的消息在数组末尾
    
    if (messageIndex > 0 && state.messages[messageIndex - 1]) {
      const prevMessage = state.messages[messageIndex - 1];
      const currentRelative = Number(message.relativeTime) || 0;
      const prevRelative = Number(prevMessage.relativeTime) || 0;
      const interval = currentRelative - prevRelative;
      
      // DEBUG: 临时显示原始 relativeTime 值
      intervalText = `rt:${currentRelative}`;
      
      if (interval > 0) {
        if (interval < 1000) {
          intervalText = `${Math.round(interval)}ms`;
        } else {
          intervalText = `${(interval / 1000).toFixed(2)}s`;
          intervalClass = 'interval-long';
        }
      } else if (interval === 0) {
        // 间隔为 0，说明两条消息几乎同时发送
        intervalText = '0ms';
        intervalClass = 'interval-zero';
      } else {
        // 负值，不应该发生（时间戳乱序）
        intervalText = `${Math.round(interval)}ms`;
        intervalClass = 'interval-negative';
      }
    } else if (messageIndex === 0) {
      // 第一条消息显示"开始"
      intervalText = '开始';
      intervalClass = 'interval-start';
    }

    const dirClass = message.direction === 'send' ? 'dir-send' : 'dir-receive';
    const dirLabel = message.direction === 'send' ? '&#8593;' : '&#8595;';
    const typeClass = `type-${message.dataType}`;
    const size = message.data ? (typeof message.data === 'string' ? message.data.length : 0) : 0;
    const previewData = truncateString(message.data || '', 80);

    tr.innerHTML = `
      <td class="col-time">${time}</td>
      <td class="col-interval ${intervalClass}" title="与上一条消息的间隔">${intervalText}</td>
      <td class="col-direction ${dirClass}">${dirLabel}</td>
      <td class="col-type ${typeClass}">${message.dataType}</td>
      <td class="col-size">${formatSize(size)}</td>
      <td class="col-data" title="${escapeHtml(previewData)}">${escapeHtml(previewData)}</td>
    `;

    tr.addEventListener('click', () => selectMessage(message));
    elements.messagesBody.appendChild(tr);
  }

  function clearMessages() {
    state.messages = [];
    state.selectedMessageId = null;
    state.recordingConnectionId = null;  // 清空消息时清除录制连接ID
    elements.messagesBody.innerHTML = '';
    elements.messageCount.textContent = '0 条消息';
    
    // 清除所有已关闭的连接，保留仍在活动的连接
    const closedConnections = [];
    state.connections.forEach((conn, connId) => {
      if (conn.status === 'closed' || conn.status === '已关闭') {
        closedConnections.push(connId);
      } else {
        // 对于仍在活动的连接，重置消息计数
        conn.messageCount = 0;
      }
    });
    
    // 删除已关闭的连接
    closedConnections.forEach(connId => {
      state.connections.delete(connId);
    });
    
    renderConnections();  // 重新渲染连接列表
    
    closeDetail();
    showToast('消息已清空', 'success');
  }

  function selectMessage(message) {
    state.selectedMessageId = message.id;

    document.querySelectorAll('#messagesBody tr').forEach(tr => {
      tr.classList.toggle('selected', parseInt(tr.dataset.messageId) === message.id);
    });

    showDetail(message);
  }

  function showDetail(message) {
    const time = new Date(message.timestamp).toLocaleString('zh-CN');
    const dirLabel = message.direction === 'send' ? '发送' : '接收';
    const size = message.data ? (typeof message.data === 'string' ? message.data.length : 0) : 0;

    let formattedData = message.data || '';
    if (message.dataType === 'json') {
      try {
        formattedData = JSON.stringify(JSON.parse(message.data), null, 2);
      } catch (e) {}
    }

    elements.detailContent.innerHTML = `
      <div class="detail-section">
        <div class="detail-section-title">消息信息</div>
        <div class="detail-row">
          <span class="detail-label">方向</span>
          <span class="detail-value ${message.direction === 'send' ? 'dir-send' : 'dir-receive'}">${dirLabel}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">类型</span>
          <span class="detail-value type-${message.dataType}">${message.dataType}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">大小</span>
          <span class="detail-value">${formatSize(size)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">时间</span>
          <span class="detail-value">${time}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">相对时间</span>
          <span class="detail-value">${message.relativeTime}ms</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">连接</span>
          <span class="detail-value">${message.connectionId}</span>
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">URL</div>
        <div class="detail-value" style="word-break: break-all; font-size: 11px;">${escapeHtml(message.url || 'N/A')}</div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">数据</div>
        <div class="detail-data ${message.dataType}">${escapeHtml(formattedData)}</div>
      </div>

      <div class="detail-actions">
        <button class="btn btn-secondary" onclick="window.copyMessageData(${message.id})">复制数据</button>
      </div>
    `;

    window.__currentMessage = message;
  }

  function closeDetail() {
    state.selectedMessageId = null;
    elements.detailContent.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">&#128196;</span>
        <p>选择一条消息查看详情</p>
      </div>
    `;
  }

  // Global functions for inline onclick handlers
  window.copyMessageData = function(messageId) {
    const message = state.messages.find(m => m.id === messageId);
    if (message && message.data) {
      navigator.clipboard.writeText(message.data).then(() => {
        showToast('数据已复制', 'success');
      });
    }
  };

  window.switchConnectionTab = function(connId) {
    // Remove active class from all tabs and contents
    document.querySelectorAll('.connection-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.connection-tab-content').forEach(content => content.classList.remove('active'));
    
    // Add active class to selected tab and content
    const selectedTab = document.querySelector(`.connection-tab[data-conn-id="${connId}"]`);
    const selectedContent = document.getElementById(`tab-content-${connId}`);
    
    if (selectedTab) selectedTab.classList.add('active');
    if (selectedContent) selectedContent.classList.add('active');
  };

  // ============================================================
  // Connection Management
  // ============================================================

  function updateConnection(payload) {
    const { connectionId, url, status, cookies } = payload;

    if (status === 'open') {
      const existing = state.connections.get(connectionId);
      if (existing) {
        existing.url = url;
        existing.status = 'open';
        if (cookies && !existing.cookies) existing.cookies = cookies;
      } else {
        state.connections.set(connectionId, {
          connectionId,
          url,
          status: 'open',
          messageCount: 0,
          cookies: cookies || '',
          createdAt: Date.now()
        });
      }
    } else if (status === 'closed') {
      const conn = state.connections.get(connectionId);
      if (conn) {
        conn.status = 'closed';
        conn.closedAt = Date.now();
      }
    }

    renderConnections();
  }

  function renderConnections() {
    const connections = Array.from(state.connections.values());
    elements.connectionCount.textContent = connections.length;

    if (connections.length === 0) {
      elements.connectionsList.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">&#128268;</span>
          <p>未检测到连接</p>
        </div>
      `;
      return;
    }

    elements.connectionsList.innerHTML = connections.map(conn => {
      // 判断是否是正在录制的连接
      const isRecording = state.isRecording && state.recordingConnectionId === conn.connectionId;
      const isActive = state.selectedConnectionId === conn.connectionId;
      
      return `
        <div class="connection-item ${isActive ? 'active' : ''} ${isRecording ? 'recording' : ''}"
             data-connection-id="${conn.connectionId}">
          <div class="connection-url">${escapeHtml(truncateString(conn.url, 50))}</div>
          <div class="connection-meta">
            <span class="connection-status ${conn.status}">${conn.status === 'open' ? '已连接' : '已关闭'}</span>
            <span>${conn.messageCount} 条</span>
            ${isRecording ? '<span class="recording-badge">● 录制中</span>' : ''}
          </div>
        </div>
      `;
    }).join('');

    elements.connectionsList.querySelectorAll('.connection-item').forEach(item => {
      item.addEventListener('click', () => {
        state.selectedConnectionId = item.dataset.connectionId;
        renderConnections();
        filterByConnection(state.selectedConnectionId);
      });
    });
  }

  function filterByConnection(connectionId) {
    elements.messagesBody.innerHTML = '';
    const filtered = state.messages.filter(m => m.connectionId === connectionId);
    filtered.forEach(msg => appendMessageRow(msg));
  }

  // ============================================================
  // UI Helpers
  // ============================================================

  function restorePreferences() {
    // Compact mode removed
  }

  function persistPreferences() {
    // Compact mode removed
  }

  function getReplayRepeatCount() {
    const value = Number(elements.replayRepeatCount?.value || 1);
    if (!Number.isFinite(value)) return 1;
    return Math.min(100, Math.max(1, Math.floor(value)));
  }

  function getReplayInterval() {
    const value = Number(elements.replayInterval?.value || 0);
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(3600, value)); // 0-3600秒
  }

  function calculateReplayEstimate(messageCount, repeatCount, intervalSeconds, useMessageTiming = false, messages = []) {
    let totalTimeMs = 0;
    
    if (useMessageTiming && messages.length > 0) {
      // 使用消息的实际时间间隔计算 - 累加所有间隔
      let sequenceDuration = 0;
      for (let i = 1; i < messages.length; i++) {
        const currentRelative = Number(messages[i].relativeTime) || 0;
        const prevRelative = Number(messages[i - 1].relativeTime) || 0;
        sequenceDuration += Math.max(0, currentRelative - prevRelative);
      }
      totalTimeMs = sequenceDuration * repeatCount;
    } else {
      // 使用固定间隔计算（旧逻辑）
      const messageTimeMs = messageCount * 50;
      totalTimeMs = messageTimeMs * repeatCount;
    }
    
    // 回放间隔只应用于重复之间（最后一次后无间隔）
    const intervalTimeMs = intervalSeconds * 1000 * (repeatCount - 1);
    const totalMs = totalTimeMs + intervalTimeMs;
    
    // 格式化时间
    if (totalMs < 1000) {
      return `${Math.round(totalMs)}ms`;
    } else if (totalMs < 60000) {
      return `${(totalMs / 1000).toFixed(1)}秒`;
    } else if (totalMs < 3600000) {
      return `${(totalMs / 60000).toFixed(1)}分钟`;
    } else {
      return `${(totalMs / 3600000).toFixed(1)}小时`;
    }
  }

  function updateReplayEstimate() {
    const repeatCount = getReplayRepeatCount();
    const intervalSeconds = getReplayInterval();
    
    // 使用实际存储的消息数组
    const messages = state.currentBehaviorMessages || [];
    
    if (messages.length > 0 && elements.replayEstimateTime) {
      const estimate = calculateReplayEstimate(
        messages.length, 
        repeatCount, 
        intervalSeconds,
        true,  // 使用消息时间模式
        messages
      );
      elements.replayEstimateTime.textContent = estimate;
    } else {
      elements.replayEstimateTime.textContent = '-';
    }
  }

  function saveReplaySettings() {
    if (!state.currentBehaviorId) {
      showToast('没有选择行为', 'error');
      return;
    }

    const repeatCount = getReplayRepeatCount();
    const intervalSeconds = getReplayInterval();

    chrome.storage.local.get(['wss_behaviors'], (result) => {
      const behaviors = result.wss_behaviors || {};
      const behavior = behaviors[state.currentBehaviorId];
      
      if (!behavior) {
        showToast('行为不存在', 'error');
        return;
      }

      // 更新回放设置
      behavior.replayCount = repeatCount;
      behavior.replayInterval = intervalSeconds;

      // 保存回 storage
      chrome.storage.local.set({ wss_behaviors: behaviors }, () => {
        showToast('回放设置已保存', 'success');
      });
    });
  }

  function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
  }

  function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
  }

  function scrollToBottom() {
    const container = document.querySelector('.messages-table-container');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  function toggleAutoScroll() {
    state.autoScroll = !state.autoScroll;
    elements.btnAutoScroll.setAttribute('active', state.autoScroll);
    showToast(state.autoScroll ? '自动滚动已开启' : '自动滚动已关闭', 'success');
  }

  function showToast(message, type = 'success') {
    const icon = type === 'success' ? '&#10003;' : '&#10007;';
    elements.toast.querySelector('.toast-icon').innerHTML = icon;
    elements.toast.querySelector('.toast-message').textContent = message;
    elements.toast.className = `toast active ${type}`;

    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => {
      elements.toast.classList.remove('active');
    }, 3000);
  }

  // ============================================================
  // Utility Functions
  // ============================================================

  function truncateString(str, maxLength) {
    if (!str) return '';
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function getDefaultBehaviorConnection(preferredConnectionId, preferredUrl) {
    if (preferredConnectionId && state.connections.has(preferredConnectionId)) {
      return state.connections.get(preferredConnectionId);
    }

    const connections = Array.from(state.connections.values());
    if (connections.length === 0) return null;

    if (preferredUrl) {
      const exact = connections.find(c => c.url === preferredUrl);
      if (exact) return exact;

      const fuzzy = connections.find(c =>
        c.url && (c.url.includes(preferredUrl) || preferredUrl.includes(c.url))
      );
      if (fuzzy) return fuzzy;
    }

    return connections.find(c => c.status === 'open') || connections[0];
  }

  // ============================================================
  // Behavior Management
  // ============================================================

  function openModalForCreate() {
    elements.editBehaviorId.value = '';
    elements.behaviorName.value = '';
    elements.behaviorUrl.value = '';
    elements.behaviorCookies.value = '';
    elements.behaviorDesc.value = '';

    // Auto-fill from current recording
    // 过滤出选中连接的消息
    const filteredMessages = state.messages.filter(m => 
      m.direction === 'send' && 
      (!state.recordingConnectionId || m.connectionId === state.recordingConnectionId)
    );
    
    if (filteredMessages.length > 0) {
      const firstMessage = filteredMessages[0];
      elements.behaviorUrl.value = firstMessage.url || '';
      const conn = getDefaultBehaviorConnection(firstMessage.connectionId, firstMessage.url);
      elements.behaviorCookies.value = conn?.cookies || '';
      
      // 只显示选中的连接
      renderConnectionsPreview(filteredMessages, state.recordingConnectionId);
    } else {
      elements.behaviorConnections.innerHTML = '<div class="empty-state"><p>无录制消息</p></div>';
    }

    elements.behaviorModalTitle.textContent = '保存行为';
    openModal('saveBehaviorModal');
    elements.behaviorName.focus();
  }

  function renderConnectionsPreview(messages, recordingConnectionId) {
    // Group messages by connectionId
    const connectionsMap = new Map();
    messages.forEach(msg => {
      const connId = msg.connectionId || 'default';
      if (!connectionsMap.has(connId)) {
        connectionsMap.set(connId, {
          url: msg.url || '(未知URL)',
          count: 0
        });
      }
      connectionsMap.get(connId).count++;
    });

    // Render connections
    let html = '';
    connectionsMap.forEach((conn, connId) => {
      const isRecording = recordingConnectionId && connId === recordingConnectionId;
      html += `
        <div class="connection-preview-item ${isRecording ? 'recording' : ''}">
          ${isRecording ? '<span class="recording-badge">● 录制中</span>' : ''}
          <span class="connection-preview-url" title="${escapeHtml(conn.url)}">${escapeHtml(truncateString(conn.url, 60))}</span>
          <span class="connection-preview-count">${conn.count} 条消息</span>
        </div>
      `;
    });
    
    elements.behaviorConnections.innerHTML = html;
  }

  function editBehavior(behaviorId) {
    chrome.runtime.sendMessage({
      type: 'GET_BEHAVIOR',
      payload: { behaviorId }
    }, (response) => {
      if (response?.success) {
        const bhv = response.behavior;
        elements.editBehaviorId.value = bhv.behaviorId;
        elements.behaviorName.value = bhv.name;
        elements.behaviorUrl.value = bhv.url || '';
        elements.behaviorCookies.value = bhv.cookies || '';
        elements.behaviorDesc.value = bhv.description || '';
        elements.behaviorModalTitle.textContent = '编辑行为';
        
        // 渲染录制连接预览
        if (bhv.messages && bhv.messages.length > 0) {
          renderConnectionsPreview(bhv.messages, bhv.connectionId || null);
        } else {
          elements.behaviorConnections.innerHTML = '<div class="empty-state"><p>无录制消息</p></div>';
        }
        
        openModal('saveBehaviorModal');
        elements.behaviorName.focus();
      } else {
        showToast('获取行为信息失败', 'error');
      }
    });
  }

  function saveOrUpdateBehavior() {
    const behaviorId = elements.editBehaviorId.value.trim();
    const name = elements.behaviorName.value.trim();

    if (!name) {
      showToast('请输入行为名称', 'error');
      return;
    }

    // If editing, update existing behavior
    if (behaviorId) {
      chrome.runtime.sendMessage({
        type: 'UPDATE_BEHAVIOR',
        payload: {
          behaviorId,
          name,
          description: elements.behaviorDesc.value.trim(),
          url: elements.behaviorUrl.value.trim(),
          cookies: elements.behaviorCookies.value.trim(),
          connectionId: state.recordingConnectionId || null,  // 保留连接ID
          replayCount: getReplayRepeatCount(),  // 保存回放次数
          replayInterval: getReplayInterval()  // 保存回放间隔
        }
      }, (response) => {
        if (response?.success) {
          showToast('行为已更新', 'success');
          closeModal('saveBehaviorModal');
          loadBehaviors();
        } else {
          showToast('更新失败: ' + (response?.error || '未知错误'), 'error');
        }
      });
      return;
    }

    // Create new behavior from current messages
    // 只保存录制时选中的连接的消息
    const sendMessages = state.messages.filter(m => 
      m.direction === 'send' && 
      (!state.recordingConnectionId || m.connectionId === state.recordingConnectionId)
    );
    
    // Get all unique WebSocket URLs from messages
    const uniqueUrls = [...new Set(sendMessages.map(m => m.url).filter(Boolean))];
    const wsUrl = uniqueUrls.length > 0 ? uniqueUrls[0] : elements.behaviorUrl.value.trim();
    
    const defaultConn = getDefaultBehaviorConnection(sendMessages[0]?.connectionId, wsUrl);
    const cookies = elements.behaviorCookies.value.trim() || defaultConn?.cookies || '';
    
    const normalizedMessages = sendMessages.map((m, index) => {
      const currentRelative = Number(m.relativeTime) || 0;
      const prevRelative = index > 0 ? (Number(sendMessages[index - 1].relativeTime) || 0) : 0;
      const delay = index === 0 ? currentRelative : Math.max(0, currentRelative - prevRelative);

      // Debug: Log message timing info
      if (index < 5) {  // Only log first 5 messages
        console.log('[Panel] Saving message:', {
          index,
          relativeTime: m.relativeTime,
          currentRelative,
          prevRelative,
          delay,
          data: (m.data || '').substring(0, 30)
        });
      }

      return {
        connectionId: m.connectionId,
        data: m.data,
        dataType: m.dataType,
        replayData: m.replayData || {
          format: 'text',
          value: typeof m.data === 'string' ? m.data : String(m.data ?? '')
        },
        protocols: Array.isArray(m.protocols) ? m.protocols : [],
        delay,
        relativeTime: currentRelative,
        url: m.url
      };
    });

    chrome.runtime.sendMessage({
      type: 'SAVE_BEHAVIOR',
      payload: {
        name,
        description: elements.behaviorDesc.value.trim(),
        url: wsUrl,
        cookies,
        connectionId: state.recordingConnectionId || null,  // 保存录制的连接ID
        replayCount: getReplayRepeatCount(),  // 保存回放次数
        replayInterval: getReplayInterval(),  // 保存回放间隔
        messages: normalizedMessages
      }
    }, (response) => {
      if (response?.success) {
        showToast('行为已保存', 'success');
        closeModal('saveBehaviorModal');
        loadBehaviors();
      } else {
        showToast('保存失败: ' + (response?.error || '未知错误'), 'error');
      }
    });
  }

  function loadBehaviors() {
    chrome.runtime.sendMessage({ type: 'GET_BEHAVIORS' }, (response) => {
      if (response?.success) {
        renderBehaviors(response.behaviors || []);
      }
    });
  }

  function renderBehaviors(behaviors) {
    elements.behaviorCount.textContent = behaviors.length;

    if (behaviors.length === 0) {
      elements.behaviorsList.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">&#128203;</span>
          <p>暂无保存的行为</p>
          <p class="empty-hint">录制结束后会自动提示保存</p>
        </div>`;
      return;
    }

    elements.behaviorsList.innerHTML = behaviors.map(bhv => {
      // Get unique connections by connectionId (not just URL)
      const uniqueConnections = bhv.messages ? 
        [...new Map(bhv.messages.map(m => [m.connectionId, m.url])).entries()] 
        : [];
      const connectionCount = uniqueConnections.length;

      return `
        <div class="behavior-item" data-id="${bhv.behaviorId}">
          <div class="behavior-item-header">
            <span class="behavior-item-name">${escapeHtml(bhv.name)}</span>
            <div class="behavior-item-actions">
              <button class="btn-icon-btn" title="回放" data-action="replay" data-id="${bhv.behaviorId}">&#9654;</button>
              <button class="btn-icon-btn" title="编辑" data-action="edit" data-id="${bhv.behaviorId}">&#9998;</button>
              <button class="btn-icon-btn" title="删除" data-action="delete" data-id="${bhv.behaviorId}">&#10005;</button>
            </div>
          </div>
          <div class="behavior-item-desc">${escapeHtml(bhv.description || '无描述')}</div>
          <div class="behavior-item-meta">
            <span>${bhv.messages?.length || 0} 条消息</span>
            <span>${connectionCount > 0 ? `🔗 ${connectionCount} 个WSS连接` : ''}</span>
            <span>${new Date(bhv.updatedAt).toLocaleString('zh-CN')}</span>
          </div>
          ${connectionCount > 1 ? `<div class="behavior-item-urls">${uniqueConnections.slice(0, 2).map(([connId, url]) => `<div class="behavior-item-url" title="${escapeHtml(url)}">${escapeHtml(truncateString(url, 60))}</div>`).join('')}${uniqueConnections.length > 2 ? `<div class="behavior-item-url-more">+${uniqueConnections.length - 2} 更多</div>` : ''}</div>` : ''}
        </div>
      `;
    }).join('');

    // Bind behavior item click → open detail modal
    elements.behaviorsList.querySelectorAll('.behavior-item').forEach(item => {
      item.addEventListener('click', () => {
        viewBehaviorDetail(item.dataset.id);
      });
    });

    // Bind action buttons
    elements.behaviorsList.querySelectorAll('[data-action="replay"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        replayBehavior(btn.dataset.id);
      });
    });

    elements.behaviorsList.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        editBehavior(btn.dataset.id);
      });
    });

    elements.behaviorsList.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteBehavior(btn.dataset.id);
      });
    });
  }

  function viewBehaviorDetail(behaviorId) {
    chrome.runtime.sendMessage({
      type: 'GET_BEHAVIOR',
      payload: { behaviorId }
    }, (response) => {
      if (response?.success) {
        const bhv = response.behavior;
        state.currentBehaviorId = behaviorId;
        state.currentBehaviorMessages = bhv.messages || [];  // 保存消息数组用于估算

        elements.behaviorDetailTitle.textContent = bhv.name;
        elements.detailBehaviorName.textContent = bhv.name;
        elements.detailBehaviorMessages.textContent = `${bhv.messages?.length || 0} 条消息`;
        elements.detailBehaviorDate.textContent = new Date(bhv.updatedAt).toLocaleString('zh-CN');
        elements.replayRepeatCount.value = String(Math.min(100, Math.max(1, Number(bhv.replayCount || 1))));
        elements.replayInterval.value = String(bhv.replayInterval || 0);  // 初始化回放间隔

        // Cookies
        elements.detailCookies.textContent = bhv.cookies || '(无 Cookie)';

        // Group messages by connectionId and render as tabs
        if (bhv.messages && bhv.messages.length > 0) {
          console.log('[Panel] Total messages:', bhv.messages.length);
          console.log('[Panel] All connectionIds:', bhv.messages.map(m => m.connectionId));
          
          const connectionsMap = new Map();
          
          bhv.messages.forEach(msg => {
            const connId = msg.connectionId || 'default';
            if (!connectionsMap.has(connId)) {
              connectionsMap.set(connId, {
                url: msg.url || bhv.url || '(未知URL)',
                messages: []
              });
            }
            connectionsMap.get(connId).messages.push(msg);
          });

          console.log('[Panel] Grouped into connections:', connectionsMap.size);
          connectionsMap.forEach((conn, connId) => {
            console.log(`[Panel] Connection ${connId}:`, conn.messages.length, 'messages');
          });

          // Convert to array for easier indexing
          const connections = Array.from(connectionsMap.entries());
          
          // 更新估算时间
          updateReplayEstimate();
          
          // 如果只有一个连接，直接显示消息列表，不显示 tabs
          if (connections.length === 1) {
            const [connId, conn] = connections[0];
            let html = '';
            
            conn.messages.forEach((msg, i) => {
              const size = msg.size || msg.replayData?.byteLength || 0;
              const sizeStr = size > 0 ? ` (${formatBytes(size)})` : '';
              
              // Calculate interval from previous message
              let intervalHtml = '';
              if (i > 0 && conn.messages[i - 1]) {
                const currentRelative = Number(msg.relativeTime) || 0;
                const prevRelative = Number(conn.messages[i - 1].relativeTime) || 0;
                const interval = currentRelative - prevRelative;
                
                let intervalText = '';
                let intervalClass = 'interval-normal';
                
                if (interval > 0) {
                  if (interval < 1000) {
                    intervalText = `${Math.round(interval)}ms`;
                  } else {
                    intervalText = `${(interval / 1000).toFixed(2)}s`;
                    intervalClass = 'interval-long';
                  }
                } else if (interval === 0) {
                  intervalText = '0ms';
                  intervalClass = 'interval-zero';
                } else {
                  intervalText = `${Math.round(interval)}ms`;
                  intervalClass = 'interval-negative';
                }
                
                intervalHtml = `<span class="message-seq-interval ${intervalClass}">${intervalText}</span>`;
              } else {
                intervalHtml = '<span class="message-seq-interval interval-first">开始</span>';
              }
              
              html += `
                <div class="message-seq-item" data-conn-id="${escapeHtml(connId)}" data-index="${i}">
                  <span class="message-seq-index">#${i + 1}</span>
                  ${intervalHtml}
                  <span class="message-seq-data">${escapeHtml(truncateString(msg.data || '', 100))}</span>
                  <span class="message-seq-type">${msg.dataType}${sizeStr}</span>
                  <div class="message-seq-actions">
                    <button class="btn-icon-btn-sm message-delete-btn" data-conn-id="${escapeHtml(connId)}" data-index="${i}" title="删除">&#10005;</button>
                  </div>
                </div>
              `;
            });
            
            elements.detailMessages.innerHTML = html;
            
            // 添加删除按钮事件监听器
            elements.detailMessages.querySelectorAll('.message-delete-btn').forEach(btn => {
              btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const connId = btn.dataset.connId;
                const index = parseInt(btn.dataset.index);
                console.log('[Panel] Delete button clicked:', { connId, index });
                deleteMessage(connId, index);
              });
            });
          } else {
            // 多个连接，显示 tabs
            // Render tabs and content
            let html = '<div class="connection-tabs-container">';
          
          // Tab headers
          html += '<div class="connection-tabs">';
          connections.forEach(([connId, conn], index) => {
            const isActive = index === 0 ? ' active' : '';
            html += `
              <button class="connection-tab${isActive}" data-conn-id="${escapeHtml(connId)}">
                <span class="tab-url" title="${escapeHtml(conn.url)}">${escapeHtml(truncateString(conn.url, 40))}</span>
                <span class="tab-count">${conn.messages.length}</span>
              </button>
            `;
          });
          html += '</div>';
          
          // Tab content
          html += '<div class="connection-tab-contents">';
          connections.forEach(([connId, conn], index) => {
            const isActive = index === 0 ? ' active' : '';
            html += `
              <div class="connection-tab-content${isActive}" id="tab-content-${escapeHtml(connId)}">
            `;
            
            conn.messages.forEach((msg, i) => {
              const size = msg.size || msg.replayData?.byteLength || 0;
              const sizeStr = size > 0 ? ` (${formatBytes(size)})` : '';
              
              // Calculate interval from previous message
              let intervalHtml = '';
              if (i > 0 && conn.messages[i - 1]) {
                const currentRelative = Number(msg.relativeTime) || 0;
                const prevRelative = Number(conn.messages[i - 1].relativeTime) || 0;
                const interval = currentRelative - prevRelative;
                
                let intervalText = '';
                let intervalClass = 'interval-normal';
                
                if (interval > 0) {
                  if (interval < 1000) {
                    intervalText = `${Math.round(interval)}ms`;
                  } else {
                    intervalText = `${(interval / 1000).toFixed(2)}s`;
                    intervalClass = 'interval-long';
                  }
                } else if (interval === 0) {
                  intervalText = '0ms';
                  intervalClass = 'interval-zero';
                } else {
                  intervalText = `${Math.round(interval)}ms`;
                  intervalClass = 'interval-negative';
                }
                
                intervalHtml = `<span class="message-seq-interval ${intervalClass}">${intervalText}</span>`;
              } else {
                intervalHtml = '<span class="message-seq-interval interval-first">开始</span>';
              }
              
              html += `
                <div class="message-seq-item" data-conn-id="${escapeHtml(connId)}" data-index="${i}">
                  <span class="message-seq-index">#${i + 1}</span>
                  ${intervalHtml}
                  <span class="message-seq-data">${escapeHtml(truncateString(msg.data || '', 100))}</span>
                  <span class="message-seq-type">${msg.dataType}${sizeStr}</span>
                  <div class="message-seq-actions">
                    <button class="btn-icon-btn-sm message-delete-btn" data-conn-id="${escapeHtml(connId)}" data-index="${i}" title="删除">&#10005;</button>
                  </div>
                </div>
              `;
            });
            
            html += '</div>';
          });
          html += '</div></div>';
          
          elements.detailMessages.innerHTML = html;
          
          // Add event listeners for tab switching
          elements.detailMessages.querySelectorAll('.connection-tab').forEach(tab => {
            tab.addEventListener('click', () => {
              const connId = tab.dataset.connId;
              window.switchConnectionTab(connId);
            });
          });
          
          // Add event listeners for message delete buttons
          elements.detailMessages.querySelectorAll('.message-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
              e.stopPropagation();
              const connId = btn.dataset.connId;
              const index = parseInt(btn.dataset.index);
              console.log('[Panel] Delete button clicked:', { connId, index });
              deleteMessage(connId, index);
            });
          });
          }
        } else {
          elements.detailMessages.innerHTML = '<div class="empty-state"><p>无消息</p></div>';
        }

        openModal('behaviorDetailModal');
      } else {
        showToast('获取行为详情失败', 'error');
      }
    });
  }

  // ============================================================
  // Message Editing Functions
  // ============================================================

  function openEditMessageDialog(connId, index) {
    console.log('[Panel] openEditMessageDialog called:', { connId, index });
    
    chrome.storage.local.get(['wss_behaviors'], (result) => {
      const behaviors = result.wss_behaviors || {};
      const behavior = behaviors[state.currentBehaviorId];
      if (!behavior) {
        showToast('行为不存在', 'error');
        return;
      }

      console.log('[Panel] Behavior messages structure:', behavior.messages);
      
      // Find the message in the behavior (messages is a flat array)
      const messages = behavior.messages || [];
      
      // Filter messages by connectionId
      const connMessages = messages.filter(m => m.connectionId === connId);
      console.log('[Panel] Messages for connection:', { connId, count: connMessages.length });
      
      const msgData = connMessages[index];
      if (!msgData) {
        showToast('消息不存在', 'error');
        console.error('[Panel] Message not found:', { connId, index, connMessages });
        return;
      }

      // Fill the form
      elements.editMessageTitle.textContent = '编辑消息';
      elements.editMessageIndex.value = index;
      elements.editMessageConnId.value = connId;
      elements.editMessageUrl.value = msgData.url || behavior.url || '';
      elements.editMessageDataType.value = msgData.dataType || 'text';
      
      // 处理二进制数据：如果是 Base64 编码，解码为原始文本
      let displayData = '';
      if (msgData.dataType === 'binary' && msgData.replayData?.format === 'binary-base64' && msgData.replayData.value) {
        try {
          // 将 Base64 解码为原始字节，再转为文本
          const binary = atob(msgData.replayData.value);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          displayData = new TextDecoder().decode(bytes);
        } catch (e) {
          console.warn('[Panel] Failed to decode binary data:', e);
          displayData = msgData.replayData.value; // 如果解码失败，显示原始 Base64
        }
      } else {
        displayData = msgData.replayData?.value || msgData.data || '';
      }
      
      elements.editMessageData.value = displayData;
      elements.editMessageDelay.value = msgData.delay || 0;

      // Initialize binary format controls
      handleDataTypeChange();
      
      // Set the appropriate format button based on data type
      if (msgData.dataType === 'binary' && elements.binaryFormatSelector) {
        // Default to raw for binary data
        elements.binaryFormatSelector.querySelectorAll('.btn-icon-btn-sm').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.format === 'raw');
        });
      }

      console.log('[Panel] Opening edit modal with data:', msgData);
      openModal('editMessageModal');
    });
  }

  function openAddMessageDialog() {
    chrome.storage.local.get(['wss_behaviors'], (result) => {
      const behaviors = result.wss_behaviors || {};
      const behavior = behaviors[state.currentBehaviorId];
      if (!behavior) {
        showToast('行为不存在', 'error');
        return;
      }

      // Fill the form with default values
      elements.editMessageTitle.textContent = '添加消息';
      elements.editMessageIndex.value = '-1'; // -1 indicates new message
      elements.editMessageConnId.value = behavior.messages?.[0]?.connectionId || '';
      elements.editMessageUrl.value = behavior.url || '';
      elements.editMessageDataType.value = 'text';
      elements.editMessageData.value = '';
      elements.editMessageDelay.value = 0;

      openModal('editMessageModal');
    });
  }

  function saveEditedMessage() {
    const connId = elements.editMessageConnId.value.trim();
    const index = parseInt(elements.editMessageIndex.value);
    const url = elements.editMessageUrl.value.trim();
    const dataType = elements.editMessageDataType.value;
    const data = elements.editMessageData.value;
    const delay = parseInt(elements.editMessageDelay.value) || 0;

    if (!data) {
      showToast('请输入消息内容', 'error');
      return;
    }

    chrome.storage.local.get(['wss_behaviors'], (result) => {
      const behaviors = result.wss_behaviors || {};
      const behavior = behaviors[state.currentBehaviorId];
      if (!behavior) {
        showToast('行为不存在', 'error');
        return;
      }

      // Filter messages by connectionId
      const allMessages = behavior.messages || [];
      const connMessages = allMessages.filter(m => m.connectionId === connId);
      
      if (index === -1) {
        // Add new message
        let replayDataValue = data;
        let dataStr = data;
        
        // 如果是二进制类型，将文本编码为 Base64
        if (dataType === 'binary') {
          try {
            const bytes = new TextEncoder().encode(data);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            replayDataValue = btoa(binary);
            dataStr = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
          } catch (e) {
            console.error('[Panel] Failed to encode binary data:', e);
          }
        }
        
        const newMessage = {
          connectionId: connId,
          data: dataStr,
          dataType,
          replayData: {
            format: dataType === 'json' ? 'json' : (dataType === 'binary' ? 'binary-base64' : 'text'),
            value: replayDataValue,
            byteLength: dataType === 'binary' ? new TextEncoder().encode(data).length : undefined
          },
          protocols: [],
          delay,
          relativeTime: 0,
          url
        };
        allMessages.push(newMessage);
      } else {
        // Edit existing message - find the actual index in the flat array
        let currentIndex = 0;
        let actualIndex = -1;
        
        for (let i = 0; i < allMessages.length; i++) {
          if (allMessages[i].connectionId === connId) {
            if (currentIndex === index) {
              actualIndex = i;
              break;
            }
            currentIndex++;
          }
        }
        
        if (actualIndex !== -1 && allMessages[actualIndex]) {
          let replayDataValue = data;
          let dataStr = data;
          
          // 如果是二进制类型，将文本编码为 Base64
          if (dataType === 'binary') {
            try {
              const bytes = new TextEncoder().encode(data);
              let binary = '';
              for (let i = 0; i < bytes.length; i++) {
                binary += String.fromCharCode(bytes[i]);
              }
              replayDataValue = btoa(binary);
              dataStr = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
            } catch (e) {
              console.error('[Panel] Failed to encode binary data:', e);
            }
          }
          
          allMessages[actualIndex].data = dataStr;
          allMessages[actualIndex].dataType = dataType;
          allMessages[actualIndex].replayData = {
            format: dataType === 'json' ? 'json' : (dataType === 'binary' ? 'binary-base64' : 'text'),
            value: replayDataValue,
            byteLength: dataType === 'binary' ? new TextEncoder().encode(data).length : undefined
          };
          allMessages[actualIndex].delay = delay;
          allMessages[actualIndex].url = url;
        }
      }

      // Save back to storage
      chrome.storage.local.set({ wss_behaviors: behaviors }, () => {
        showToast(index === -1 ? '消息已添加' : '消息已更新', 'success');
        closeModal('editMessageModal');
        viewBehaviorDetail(state.currentBehaviorId);
      });
    });
  }

  function deleteMessage(connId, index) {
    if (!confirm('确定要删除这条消息吗？')) {
      return;
    }

    chrome.storage.local.get(['wss_behaviors'], (result) => {
      const behaviors = result.wss_behaviors || {};
      const behavior = behaviors[state.currentBehaviorId];
      if (!behavior) {
        showToast('行为不存在', 'error');
        return;
      }

      // Find the actual index in the flat array
      const allMessages = behavior.messages || [];
      let currentIndex = 0;
      let actualIndex = -1;
      
      for (let i = 0; i < allMessages.length; i++) {
        if (allMessages[i].connectionId === connId) {
          if (currentIndex === index) {
            actualIndex = i;
            break;
          }
          currentIndex++;
        }
      }
      
      if (actualIndex !== -1) {
        allMessages.splice(actualIndex, 1);

        // Save back to storage
        chrome.storage.local.set({ wss_behaviors: behaviors }, () => {
          showToast('消息已删除', 'success');
          viewBehaviorDetail(state.currentBehaviorId);
        });
      } else {
        showToast('消息不存在', 'error');
      }
    });
  }

  // ============================================================
  // Export/Import Behavior Config
  // ============================================================

  function exportBehaviorConfig(behaviorId) {
    chrome.storage.local.get(['wss_behaviors'], (result) => {
      const behaviors = result.wss_behaviors || {};
      const behavior = behaviors[behaviorId];
      if (!behavior) {
        showToast('行为不存在', 'error');
        return;
      }

      // Create export data
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        behavior: behavior
      };

      // Convert to JSON and download
      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `behavior_${behavior.name || behaviorId}_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('行为配置已导出', 'success');
    });
  }

  function importBehaviorConfig() {
    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importData = JSON.parse(event.target.result);

          // Validate structure
          if (!importData.behavior) {
            showToast('无效的行为配置文件', 'error');
            return;
          }

          const behavior = importData.behavior;

          // Generate new behavior ID
          const newBehaviorId = 'behavior_' + Date.now();

          chrome.storage.local.get(['wss_behaviors'], (result) => {
            const behaviors = result.wss_behaviors || {};

            // Add the imported behavior
            behaviors[newBehaviorId] = behavior;

            chrome.storage.local.set({ wss_behaviors: behaviors }, () => {
              showToast('行为配置已导入', 'success');
              loadBehaviors();
            });
          });
        } catch (err) {
          showToast('导入失败: ' + err.message, 'error');
        }
      };
      reader.readAsText(file);
    };

    input.click();
  }

  function startReplayBehavior(behaviorId) {
    console.log('[Replay] Starting replay for behavior:', behaviorId);
    addReplayLog('info', `准备回放行为: ${behaviorId}`);
    
    // Get behavior info for display
    chrome.runtime.sendMessage({
      type: 'GET_BEHAVIOR',
      payload: { behaviorId }
    }, (response) => {
      if (!response?.success) {
        console.error('[Replay] Failed to get behavior:', response);
        addReplayLog('error', '获取行为信息失败');
        showToast('获取行为信息失败', 'error');
        return;
      }

      const bhv = response.behavior;
      const msgCount = bhv.messages?.length || 0;
      const firstMessageUrl = bhv.messages?.[0]?.url || '';
      const runtimeConn = getDefaultBehaviorConnection(null, bhv.url || firstMessageUrl);
      const replayUrl = bhv.url || firstMessageUrl || runtimeConn?.url || '';
      const replayCookies = bhv.cookies || runtimeConn?.cookies || '';
      const repeatCount = getReplayRepeatCount();
      const intervalSeconds = getReplayInterval();
      
      // 使用消息的实际时间间隔进行估算
      const useMessageTiming = bhv.messages && bhv.messages.length > 1;
      const estimateTime = calculateReplayEstimate(
        msgCount, 
        repeatCount, 
        intervalSeconds, 
        useMessageTiming, 
        bhv.messages
      );

      console.log('[Replay] Behavior info:', {
        name: bhv.name,
        messageCount: msgCount,
        repeatCount: repeatCount,
        intervalSeconds: intervalSeconds,
        estimateTime: estimateTime,
        url: replayUrl
      });

      // Show replay panel
      elements.replayBehaviorName.textContent = bhv.name;
      elements.replayProgressFill.style.width = '0%';
      elements.replayProgressText.textContent = `执行中...`;
      
      // Show detailed info
      const detailInfoHtml = `
        <div class="detail-line">
          <span class="detail-label">消息数:</span>
          <span class="detail-value">${msgCount} 条</span>
        </div>
        <div class="detail-line">
          <span class="detail-label">回放次数:</span>
          <span class="detail-value">${repeatCount} 次</span>
        </div>
        <div class="detail-line">
          <span class="detail-label">回放间隔:</span>
          <span class="detail-value">${intervalSeconds > 0 ? intervalSeconds + '秒' : '无间隔'}</span>
        </div>
        <div class="detail-line">
          <span class="detail-label">时间模式:</span>
          <span class="detail-value" style="color: var(--accent-green);">${useMessageTiming ? '✓ 使用消息实际间隔' : '使用固定间隔'}</span>
        </div>
        <div class="detail-line">
          <span class="detail-label">估算总耗时:</span>
          <span class="detail-value" style="color: var(--accent-blue); font-weight: 600;">${estimateTime}</span>
        </div>
      `;
      elements.replayDetailInfo.innerHTML = detailInfoHtml;
      
      elements.replayLog.innerHTML = '<div class="log-entry info">开始回放: ' + msgCount + ' 条消息 × ' + repeatCount + ' 次（将广播到页面所有 WebSocket 连接）</div>';
      elements.replayPanel.style.display = 'flex';

      addReplayLog('info', `开始回放，将消息广播到页面所有 WebSocket 连接...`);

      // 发送回放命令，injected-script 会使用页面现有连接
      const messagePayload = {
        type: 'REPLAY_BEHAVIOR',
        payload: {
          behaviorId,
          url: replayUrl,
          cookies: replayCookies,
          repeatCount,
          delay: true // 启用时间间隔模式，使用消息的实际间隔时间
        }
      };
      
      console.log('[Replay] Sending replay command:', messagePayload);
      
      chrome.runtime.sendMessage(messagePayload, (resp) => {
        console.log('[Replay] Response received:', resp);
        
        if (resp?.success) {
          const duration = resp.duration || 0;
          const messageCount = resp.messageCount || 0;
          const connectionCount = resp.connectionCount || 0;
          
          console.log('[Replay] ✓ SUCCESS:', {
            messageCount,
            connectionCount,
            duration
          });
          
          addReplayLog('success', `✓ 回放成功: 发送 ${messageCount} 条消息，广播到 ${connectionCount} 个连接，耗时 ${duration}ms`);
          elements.replayProgressFill.style.width = '100%';
          elements.replayProgressText.textContent = `完成`;
        } else {
          console.error('[Replay]  FAILED:', resp?.error);
          addReplayLog('error', `✗ 回放失败: ${resp?.error || '未知错误'}`);
          elements.replayProgressText.textContent = `失败`;
        }
      });
    });
  }

  // Also keep replayBehavior for backward compatibility (direct from list button)
  function replayBehavior(behaviorId) {
    startReplayBehavior(behaviorId);
  }

  function addReplayLog(type, message) {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    entry.textContent = `[${time}] ${message}`;
    elements.replayLog.appendChild(entry);
    elements.replayLog.scrollTop = elements.replayLog.scrollHeight;
  }

  function deleteBehavior(behaviorId) {
    if (!confirm('确定要删除此行为吗？')) return;

    chrome.runtime.sendMessage({
      type: 'DELETE_BEHAVIOR',
      payload: { behaviorId }
    }, (response) => {
      if (response?.success) {
        showToast('行为已删除', 'success');
        loadBehaviors();
      } else {
        showToast('删除失败', 'error');
      }
    });
  }

  // ============================================================
  // Binary Data Utilities
  // ============================================================

  function handleDataTypeChange() {
    const dataType = elements.editMessageDataType.value;
    const isBinary = dataType === 'binary';
    
    if (elements.binaryRawPreview) {
      elements.binaryRawPreview.style.display = isBinary ? 'block' : 'none';
    }
    if (elements.binaryFormatSelector) {
      elements.binaryFormatSelector.style.display = isBinary ? 'flex' : 'none';
    }
    if (elements.binaryPreview) {
      elements.binaryPreview.style.display = isBinary ? 'block' : 'none';
    }
    
    if (isBinary) {
      updateBinaryPreview();
    }
  }

  function convertBinaryFormat(targetFormat) {
    // Since we only have Raw format now, no conversion needed
    // Just update the preview
    if (targetFormat === 'raw') {
      updateBinaryPreview();
    }
  }

  function updateBinaryPreview() {
    const data = elements.editMessageData.value.trim();
    
    if (!data) {
      elements.binarySize.textContent = '';
      elements.binaryPreview.textContent = '';
      elements.binaryPreview.style.display = 'none';
      if (elements.binaryRawPreview) {
        elements.binaryRawPreview.style.display = 'none';
      }
      return;
    }
    
    try {
      // Raw format - encode to bytes
      const bytes = new TextEncoder().encode(data);
      
      // Update size display
      const sizeBytes = bytes.length;
      const sizeKB = (sizeBytes / 1024).toFixed(2);
      elements.binarySize.textContent = `${sizeBytes} bytes (${sizeKB} KB)`;
      
      // Update raw preview (show the data directly)
      if (elements.binaryRawPreview && elements.rawPreviewContent) {
        elements.rawPreviewContent.textContent = data;
        elements.binaryRawPreview.style.display = 'block';
      }
      
      // Update hex preview
      const previewStr = Array.from(bytes.slice(0, 256))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ');
      
      if (bytes.length > 256) {
        elements.binaryPreview.textContent = previewStr + '\n... (truncated, showing first 256 bytes)';
      } else {
        elements.binaryPreview.textContent = previewStr;
      }
      elements.binaryPreview.style.display = 'block';
    } catch (err) {
      elements.binarySize.textContent = 'Invalid data';
      elements.binaryPreview.textContent = 'Error: ' + err.message;
      elements.binaryPreview.style.display = 'block';
    }
  }

  function updateBinarySize() {
    updateBinaryPreview();
  }

  // ============================================================
  // Start
  // ============================================================

  init();

})();

