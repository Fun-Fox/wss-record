# 项目结构 - 行为录制回放

## 目录概览

```
wss-record/
│
├── 📄 manifest.json              # Chrome 扩展清单（V3）
├──  README.md                  # 主文档（中文）
├── 📄 FEATURES.md                # 功能概述（中文）
├──  QUICKSTART.md              # 快速入门指南
├── 📄 PROJECT_STRUCTURE.md       # 本文件
│
├── 🔧 generate-icons.js          # 图标生成脚本
│
── 📁 src/                       # 源代码
│   ├── 📁 background/            # Service Worker（后台进程）
│   │   ── service-worker.js     # 核心逻辑、存储管理
│   │
│   ├── 📁 content/               # Content Scripts（页面注入）
│   │   ├── content-script.js     # 页面与扩展之间的桥接
│   │   └── injected-script.js    # WebSocket 拦截器（在页面中运行）
│   │
│   ├── 📁 devtools/              # DevTools 面板
│   │   ├── devtools.html         # DevTools 入口
│   │   ├── devtools.js           # 面板注册
│   │   ├── panel.html            # 主 UI 结构
│   │   ├── panel.css             # 深色主题样式
│   │   └── panel.js              # 所有面板逻辑和交互
│   │
│   ├── 📁 popup/                 # 浏览器操作弹窗
│   │   ├── popup.html            # 弹窗 UI 结构
│   │   ── popup.js              # 弹窗逻辑
│   │
│   └── 📁 icons/                 # 扩展图标
│       ├── icon-16.png           # 16x16 像素
│       ├── icon-48.png           # 48x48 像素
│       ├── icon-128.png          # 128x128 像素
│       └── icon.svg              # 源 SVG
│
└── 📁 doc/                       # 文档图片
    ├── 1.png                     # 截图 1
    ├── 2.png                     # 截图 2
    ├── 3.png                     # 截图 3
    └── 4.png                     # 截图 4
```

## 文件描述

### 根目录文件

#### `manifest.json`
**用途**: Chrome 扩展配置
**关键设置**:
- 扩展名称: "行为录制回放"
- 版本: 1.0.0
- 权限: storage, webRequest, activeTab, tabs, scripting
- 后台 Service Worker 位置
- Content Script 注入规则
- DevTools 面板注册

#### 文档文件
- **README.md**: 完整的中文文档，包含安装、使用、架构
- **FEATURES.md**: 中文功能列表和技术细节
- **QUICKSTART.md**: 逐步入门指南
- **PROJECT_STRUCTURE.md**: 本文件 - 目录组织

#### `generate-icons.js`
**用途**: 从 SVG 源生成 PNG 图标
**用法**: `node generate-icons.js`
**输出**: 创建 icon-16.png, icon-48.png, icon-128.png

---

### 源代码（`src/`）

#### 后台 Service Worker（`src/background/`）

**`service-worker.js`**（约 1160 行）
- **角色**: 扩展的核心协调器
- **职责**:
  - 跟踪所有标签页中的 WebSocket 连接
  - 存储和检索录制的消息
  - 管理行为配置
  - 处理回放执行
  - 处理导入/导出操作
  - 协调组件间通信
- **关键函数**:
  - `handleWebSocketMessage()`: 处理拦截的消息
  - `saveBehavior()`: 将行为持久化到存储
  - `getBehaviors()`: 检索已保存的行为
  - `replayBehavior()`: 执行行为回放
  - `exportScript()`: 生成脚本文件
  - `shouldFilterMessage()`: 应用录制过滤设置

#### Content Scripts（`src/content/`）

**`content-script.js`**（约 187 行）
- **角色**: 网页与扩展之间的桥接
- **职责**:
  - 将 `injected-script.js` 注入页面上下文
  - 将消息从页面转发到扩展
  - 接收从扩展到页面的命令
  - 维护隔离的执行上下文
- **通信流程**:
  ```
  页面 ←→ Content Script ←→ Service Worker ←→ DevTools 面板
  ```
- **关键功能**:
  - `GET_WEBSOCKET_CONNECTIONS`: 获取页面中的 WebSocket 连接
  - `REPLAY_BEHAVIOR`: 执行行为回放
  - `REPLAY_INJECT_MESSAGE`: 注入单条消息
  - `STOP_REPLAY`: 停止回放

**`injected-script.js`**（约 300 行）
- **角色**: WebSocket 拦截器（在页面上下文中运行）
- **职责**:
  - 覆盖原生 `WebSocket` 构造函数
  - 捕获 `send()` 调用
  - 拦截消息事件
  - 基于录制状态筛选
  - 保留原始 WebSocket 功能
- **关键特性**:
  - 非侵入式拦截
  - 二进制消息支持
  - 连接元数据跟踪
  - 实时消息转发
  - 跨 world 通信（通过 CustomEvent）

#### DevTools 面板（`src/devtools/`）

**`devtools.html`**（最小化）
- **用途**: DevTools 面板入口
- **内容**: 加载 `devtools.js`

**`devtools.js`**（约 28 行）
- **用途**: 向 Chrome DevTools 注册面板
- **创建**: "行为录制回放" 标签页
- **面板标题**: "行为录制回放"
- **图标**: 16x16 扩展图标

**`panel.html`**（约 384 行）
- **用途**: 主 UI 结构
- **部分**:
  - 头部: Logo、状态指示器、消息计数
  - 工具栏: 录制按钮、连接选择器、清空按钮
  - 标签页: 连接、消息、行为
  - 模态框: 行为详情、回放状态、录制设置
- **关键元素**:
  - 连接列表容器
  - 消息时间线
  - 行为卡片
  - 配置输入（重复次数、间隔）
  - 估算时间显示

**`panel.css`**（约 1200 行）
- **用途**: 深色主题的完整样式
- **设计系统**:
  - CSS 自定义属性（变量）
  - 一致的间距比例
  - 调色板（深灰色、蓝色强调色）
  - 排版系统
  - 组件样式
- **关键组件**:
  - 按钮（主、次、危险）
  - 表单（输入、选择、文本区域）
  - 卡片（连接、行为）
  - 模态框（详情视图、回放状态）
  - 状态指示器（录制、空闲）
  - 时间线可视化

**`panel.js`**（约 2167 行）
- **用途**: 所有面板逻辑和用户交互
- **主要部分**:
  1. **状态管理**（第 1-150 行）
     - 录制状态
     - 当前连接
     - 选中的行为
     - UI 元素引用
     - 录制过滤设置
  
  2. **初始化**（第 150-300 行）
     - 事件监听器设置
     - 状态恢复
     - 初始 UI 渲染
  
  3. **录制逻辑**（第 300-600 行）
     - 开始/停止录制
     - 连接选择模态框
     - 连接筛选
     - 消息捕获
     - 状态更新
     - 录制过滤设置
  
  4. **连接管理**（第 600-900 行）
     - 显示连接
     - 选择/取消选择
     - 状态指示器
     - 按连接筛选消息
  
  5. **消息显示**（第 900-1100 行）
     - 渲染消息时间线
     - 格式化文本/二进制消息
     - 滚动管理
     - 自动滚动切换
  
  6. **行为管理**（第 1100-1600 行）
     - 保存行为
     - 编辑消息
     - 删除消息
     - 清空行为
     - 导入/导出
  
  7. **回放系统**（第 1600-2100 行）
     - 配置回放（次数、间隔）
     - 计算时间估算
     - 执行回放
     - 进度跟踪
     - 状态显示
  
  8. **工具函数**（第 2100-2167 行）
     - 数据格式化
     - 验证
     - 错误处理
     - Toast 通知
     - 二进制数据处理

#### Popup（`src/popup/`）

**`popup.html`**（约 157 行）
- **用途**: 浏览器操作弹窗 UI
- **部分**:
  - 头部: Logo、录制状态徽章
  - 主提示: 打开 DevTools 的说明
  - 页脚: 附加信息
- **状态指示器**: 显示录制是否激活

**`popup.js`**（约 50 行）
- **用途**: 弹窗逻辑
- **职责**:
  - 检查录制状态
  - 更新状态指示器
  - 显示当前状态
  - 提供快速访问信息

#### 图标（`src/icons/`）

**图标文件**:
- `icon-16.png`: 工具栏图标、DevTools 标签页
- `icon-48.png`: 扩展页面、中等显示
- `icon-128.png`: Chrome 应用商店、大型显示
- `icon.svg`: 源矢量图形

**生成**: 运行 `node generate-icons.js` 从 SVG 重新生成

---

## 通信流程

### 消息拦截
```
1. 网页创建 WebSocket
   ↓
2. injected-script.js 拦截构造函数
   ↓
3. 捕获 send() 和 onmessage 事件
   ↓
4. 通过 postMessage 转发到 content-script.js
   ↓
5. Content script 通过 chrome.runtime.sendMessage 发送到 service-worker.js
   ↓
6. Service worker 存储到 chrome.storage.local
   ↓
7. DevTools 面板通过 chrome.runtime.onMessage 接收更新
   ↓
8. panel.js 更新 UI 显示新消息
```

### 行为回放
```
1. 用户在 panel.js 中点击"回放"
   ↓
2. 面板发送 REPLAY_BEHAVIOR 消息到 service worker
   ↓
3. Service worker 从存储加载行为
   ↓
4. 将回放命令发送到页面（通过 content script）
   ↓
5. injected-script.js 使用页面现有连接发送消息
   ↓
6. 按配置的间隔按顺序发送消息
   ↓
7. 向面板报告进度
   ↓
8. 面板显示实时状态
   ↓
9. 显示完成通知
```

---

## 关键技术

### Chrome 扩展 API
- `chrome.storage.local`: 持久化数据存储
- `chrome.runtime.sendMessage`: 跨上下文通信
- `chrome.devtools.panels`: DevTools 集成
- `chrome.tabs`: 标签页管理
- `chrome.scripting`: 脚本注入
- `chrome.runtime.onMessage`: 消息监听

### Web API
- `WebSocket`: 原生 WebSocket API（被拦截）
- `ArrayBuffer`: 二进制数据处理
- `postMessage`: 跨上下文消息传递
- `CustomEvent`: 跨 world 通信（MAIN ↔ ISOLATED）
- `TextEncoder/TextDecoder`: 文本/二进制转换

### JavaScript 特性
- ES6+ 语法（const、let、箭头函数、async/await）
- 模块模式（部分文件使用 IIFE）
- 事件驱动架构
- 基于 Promise 的异步操作
- Map 数据结构用于连接管理

### CSS 特性
- CSS 自定义属性（变量）
- Flexbox 布局
- Grid 布局（适用时）
- 动画（录制脉冲效果）
- 深色主题配色方案
- 响应式设计原则

---

## 开发工作流

### 进行更改

1. **编辑源文件**
   - 修改 `.js`、`.html` 或 `.css` 文件
   - 无需构建步骤（原生 JS）

2. **重新加载扩展**
   - 访问 `chrome://extensions/`
   - 找到"行为录制回放"
   - 点击重新加载图标 🔄

3. **测试更改**
   - 在测试页面打开 DevTools
   - 验证功能
   - 检查控制台是否有错误

### 调试

**Service Worker**:
- `chrome://extensions/` → "Inspect views: service worker"

**DevTools 面板**:
- 右键点击面板 → "检查"

**Content Script**:
- 页面 DevTools → Console 标签页
- 查找 `[WSS]` 前缀的日志

**Injected Script**:
- 页面 DevTools → Console 标签页
- 查找 `[WSS Injected]` 前缀的日志

### 最佳实践

1. **日志记录**: 使用一致的前缀（`[WSS]`、`[WSS Injected]`、`[Panel]`）
2. **错误处理**: 将异步操作包装在 try-catch 中
3. **状态管理**: 在 service worker 中保持状态，而非面板
4. **性能**: 最小化 DOM 更新，尽可能批量处理
5. **安全**: 验证所有输入，清理输出
6. **错误处理**: 检查 `chrome.runtime.lastError` 处理消息发送失败

---

## 文件大小参考

| 文件 | 行数 | 用途 |
|------|-------|---------|
| service-worker.js | ~1160 | 后端逻辑 |
| panel.js | ~2167 | 前端逻辑 |
| panel.css | ~1200 | 样式 |
| panel.html | ~384 | UI 结构 |
| injected-script.js | ~300 | WS 拦截器 |
| content-script.js | ~187 | 注入桥接 |
| popup.html | ~157 | 弹窗 UI |
| devtools.js | ~28 | 面板注册 |

**总计**: 约 5,583 行代码

---

## 命名约定

### 文件
- kebab-case: `service-worker.js`、`content-script.js`
- 描述性: `injected-script.js`、`panel.js`

### 变量
- camelCase: `recordingState`、`currentBehaviorId`
- 类型前缀: `btnRecord`、`statusDot`

### 函数
- camelCase: `startRecording()`、`saveBehavior()`
- 动词优先: `getMessageCount()`、`updateStatus()`

### CSS 类
- kebab-case: `.recording-status`、`.message-timeline`
- BEM 风格: `.btn--primary`、`.card__header`

---

## 扩展点

### 添加新功能

1. **新消息类型**
   - 修改 `injected-script.js` 进行捕获
   - 更新 `service-worker.js` 进行存储
   - 更新 `panel.js` 进行显示

2. **新导出格式**
   - 在 `service-worker.js` 中添加导出逻辑
   - 在 `panel.html/js` 中添加 UI 选项

3. **新 UI 组件**
   - 在 `panel.html` 中添加 HTML
   - 在 `panel.css` 中设置样式
   - 在 `panel.js` 中添加逻辑
   - 在 `service-worker.js` 中添加状态

### 集成点

- **测试框架**: 导出的脚本可与 Jest、Mocha、pytest 集成
- **CI/CD**: 生成的脚本可在自动化管道中运行
- **监控**: 添加日志钩子进行分析
- **自定义协议**: 扩展拦截器以支持其他协议

---

## 性能考虑

### 存储
- 行为存储在 `chrome.storage.local`（5-10MB 限制）
- 大型消息集可能触及限制
- 考虑对非常大的行为进行分页

### 内存
- 录制期间消息保存在内存中
- 保存到行为后清除
- 避免保留不必要的数据

### UI 渲染
- 大型消息列表的虚拟滚动（未来改进）
- 批量 DOM 更新
- 防抖频繁更新

### 网络
- 不录制时开销最小
- 每次页面加载仅注入一次
- 高效的消息转发

---

## 安全说明

1. **内容安全策略**: Manifest V3 强制执行严格的 CSP
2. **无 eval()**: 所有代码都是静态的，无动态执行
3. **输入验证**: 所有用户输入在使用前都经过验证
4. **XSS 防护**: UI 中正确转义文本内容
5. **权限最小化**: 仅请求所需权限
6. **错误处理**: 正确处理 `chrome.runtime.lastError` 防止未捕获错误

---

更多信息，请参阅：
- [README.md](README.md) - 完整文档
- [FEATURES.md](FEATURES.md) - 功能详情
- [QUICKSTART.md](QUICKSTART.md) - 入门指南
