# 更新日志 - 行为录制回放

## [1.0.0] - 2026-04-30

### ✨ 新增功能

#### 核心功能
- **WebSocket 消息录制**: 实时捕获所有 WebSocket 发送消息
- **连接筛选**: 支持选择特定的 WebSocket 连接进行录制
- **行为管理**: 将录制的消息序列保存为可复用的行为
- **消息回放**: 回放保存的行为，支持配置重复次数和间隔
- **二进制消息支持**: 完整支持二进制 WebSocket 消息，可编辑十六进制数据
- **多格式导出**: 将行为导出为 Node.js 或 Python 脚本

#### 高级功能
- **录制过滤系统**: 
  - 关键词过滤：按消息内容关键词筛选
  - 类型过滤：选择要录制的消息类型（文本/JSON/二进制）
  - URL 模式过滤：按 WebSocket URL 模式筛选连接
- **时间估算**: 基于消息实际时间间隔自动计算总回放时长
- **消息编辑**: 支持编辑文本和二进制消息
- **行为导入/导出**: 支持 JSON 格式的导入导出
- **回放进度显示**: 实时显示回放进度和日志

### 🎨 界面组件

#### DevTools 面板
- 深色主题界面设计
- 连接列表，带状态指示器
- 消息时间线视图
- 行为详情模态框
- 回放状态面板
- 录制过滤设置面板

#### Popup 弹窗
- 快速访问扩展状态
- 录制状态指示器
- DevTools 面板使用说明

### 🔧 技术特性

#### 架构优化
- **Service Worker 状态恢复**: Service Worker 重启后自动恢复录制状态
- **错误处理优化**: 全面检查 `chrome.runtime.lastError`，防止未捕获错误
- **跨 World 通信**: 使用 CustomEvent 实现 MAIN world 和 ISOLATED world 之间的通信
- **动态脚本注入**: 当 content script 不存在时自动注入

#### 数据存储
- 使用 `chrome.storage.local` 持久化存储
- 连接信息、消息记录、行为配置全部本地保存
- 高效的消息转发机制

#### 性能优化
- 批量 DOM 更新
- 防抖频繁更新
- 最小化内存占用

### 🐛 Bug 修复

- 修复在特殊页面（chrome://、edge:// 等）尝试录制时的运行时错误
- 修复 content script 未加载时的消息发送失败问题
- 修复 Service Worker 重启后状态丢失问题
- 修复回放时连接不存在的错误处理

### 📝 文档

- 完整的中文 README 文档
- 快速入门指南 (QUICKSTART.md)
- 功能特性说明 (FEATURES.md)
- 项目结构说明 (PROJECT_STRUCTURE.md)
- 详细的代码注释

### 🔒 安全性

- 严格的 Chrome 扩展 Manifest V3 CSP 策略
- 无 eval() 使用，所有代码静态执行
- 输入验证和输出转义
- 权限最小化原则

### 📦 技术栈

- **Chrome Extension API**: storage, webRequest, activeTab, tabs, scripting
- **Web API**: WebSocket, ArrayBuffer, postMessage, CustomEvent
- **JavaScript**: ES6+ (const, let, arrow functions, async/await)
- **CSS**: CSS 自定义属性, Flexbox, Grid, 动画

---

## 版本说明

### 兼容性
- Chrome 浏览器 88+（Manifest V3 要求）
- 支持所有包含 WebSocket 连接的网页
- 不支持特殊页面（chrome://、edge://、about:、data: 等）

### 已知限制
- 目前仅支持录制发送（send）方向的消息
- chrome.storage.local 有 5-10MB 的存储限制
- 大型消息集可能需要定期清理

### 未来计划
- 支持接收（receive）消息录制
- 虚拟滚动优化大型消息列表
- 更多导出格式（Java、Go 等）
- 云同步功能
- 团队协作功能

---

**注意**: 这是初始版本发布，后续版本将继续优化功能和性能。
