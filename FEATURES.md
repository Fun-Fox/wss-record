# WSS Recorder - 功能说明

## 插件名称
- **扩展名称**: WSS Recorder
- **DevTools面板**: WSS Panel

## 核心功能

### 1. WebSocket 消息录制
- ✅ 实时捕获所有 WebSocket 发送/接收消息
- ✅ 支持选择特定连接进行录制
- ✅ 实时消息计数器
- ✅ 连接状态可视化指示

### 2. 行为管理
- ✅ 保存录制的消息序列为可重用行为
- ✅ 编辑单个消息（文本和二进制）
- ✅ 删除不需要的消息
- ✅ 清空整个行为
- ✅ 导入/导出行为为 JSON

### 3. 消息回放
- ✅ **回放次数**: 设置回放重复次数（1-100次）
- ✅ **回放间隔**: 配置每次回放之间的等待时间（0-3600秒，支持小数）
- ✅ **时间估算**: 自动计算总回放时长
- ✅ 实时更新估算时间
- ✅ 回放进度显示

### 4. 消息编辑
- ✅ 文本消息编辑器，带验证
- ✅ 二进制消息十六进制编辑器
- ✅ 二进制数据格式验证
- ✅ 保存/取消操作

### 5. 脚本导出
- ✅ Node.js 脚本（使用 ws 库）
- ✅ Python 脚本（使用 websockets 库）
- ✅ 包含完整的连接和消息逻辑

## 界面组件

### DevTools 面板 (WSS Panel)
- 🎨 深色主题界面
- 📋 连接列表，带状态指示器
- 📊 消息时间线视图
- 🔧 行为详情模态框
- 📈 回放状态面板

### Popup 弹窗
- ⚡ 快速访问扩展状态
- 🔴 录制状态指示器
- 📖 DevTools 面板使用说明

## 技术特性

### 数据存储
- 使用 `chrome.storage.local` 持久化存储
- 连接信息、消息记录、行为配置全部本地保存

### 回放算法
```
总耗时 = (消息数 × 50ms × 回放次数) + (间隔时间 × (回放次数 - 1))
```
- 假设每条消息处理约 50ms
- 间隔仅在重复之间应用（最后一次后无间隔）
- 自动格式化显示（毫秒/秒/分钟/小时）

### 消息格式
```javascript
{
  id: number,              // 唯一消息ID
  type: 'send' | 'receive', // 消息方向
  data: string | ArrayBuffer, // 消息内容
  timestamp: number,       // Unix时间戳
  isBinary: boolean        // 是否为二进制消息
}
```

## 使用场景

### 设备群控自动化
- 录制设备控制命令
- 回放序列进行测试
- 自动化重复控制任务

### API 测试
- 捕获 WebSocket API 交互
- 回放进行回归测试
- 验证消息格式

### 调试分析
- 检查 WebSocket 流量
- 分析消息模式
- 识别通信问题

### 文档生成
- 导出脚本供团队共享
- 记录 API 工作流程
- 创建可重现的测试用例

## 架构结构

```
wss-proxy/
├── manifest.json              # 扩展清单
├── src/
│   ├── background/
│   │   └── service-worker.js  # 后台服务工作线程
│   ├── content/
│   │   ├── content-script.js  # 内容脚本注入器
│   │   └── injected-script.js # WebSocket 拦截器
│   ├── devtools/
│   │   ├── devtools.html      # DevTools 入口
│   │   ├── devtools.js        # 面板注册
│   │   ├── panel.html         # 主面板 UI
│   │   ├── panel.css          # 面板样式
│   │   └── panel.js           # 面板逻辑
│   ├── popup/
│   │   ├── popup.html         # 弹窗 UI
│   │   └── popup.js           # 弹窗逻辑
│   └── icons/                 # 扩展图标
├── templates/
│   ├── node-ws-script.js      # Node.js 导出模板
│   └── python-websocket-script.py  # Python 导出模板
└── generate-icons.js          # 图标生成脚本
```

## 权限说明

- **storage**: 保存行为和设置
- **webRequest**: 监控 WebSocket 连接
- **activeTab**: 访问当前标签页进行注入
- **tabs**: 管理浏览器标签页
- **scripting**: 注入内容脚本
- **<all_urls>**: 在任何网站上拦截 WebSocket

## 版本历史

### v1.0.0
- ✨ 初始版本发布
- ✨ WebSocket 消息录制
- ✨ 行为管理
- ✨ 带配置的消息回放
- ✨ 多格式导出
- ✨ 二进制消息支持
- ✨ 实时时间估算
