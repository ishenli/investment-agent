# Investment Agent CLI

一个简单易用的命令行工具，用于快速启动 Investment Agent 应用。

## 安装

### 全局安装
```bash
npm install -g investment-agent
```

### 本地使用
```bash
npx investment-agent
```

## 使用方法

### 基本用法
```bash
# 启动应用并自动打开浏览器
npx investment-agent

# 指定端口
npx investment-agent --port 4000

# 不自动打开浏览器
npx investment-agent --no-open
```

### 命令行参数

| 参数 | 简写 | 描述 | 默认值 |
|------|------|------|--------|
| `--port` | `-p` | 设置端口号 | 3000 |
| `--no-open` | | 不自动打开浏览器 | false |
| `--help` | `-h` | 显示帮助信息 | |

### 示例

```bash
# 使用默认设置启动
npx investment-agent

# 使用自定义端口
npx investment-agent --port 8080

# 启动但不打开浏览器
npx investment-agent --no-open

# 查看帮助
npx investment-agent --help
```

## 功能特性

- ✅ 自动检查并安装依赖
- ✅ 自动初始化数据库（SQLite + Drizzle ORM）
- ✅ 自动启动 Next.js 开发服务器
- ✅ 智能等待服务器就绪
- ✅ 自动打开默认浏览器
- ✅ 支持自定义端口
- ✅ 优雅的错误处理
- ✅ 跨平台支持 (Windows, macOS, Linux)
- ✅ 灵活的环境适应性（可在有无 package.json 的环境中运行）

## 故障排除

### 端口被占用
如果端口 3000 被占用，可以使用 `--port` 参数指定其他端口：
```bash
npx investment-agent --port 3001
```

### 依赖安装失败
如果依赖安装失败：
1. 确保当前目录有 package.json 文件
2. 手动安装依赖：
```bash
npm install
npx investment-agent
```

### 数据库初始化失败
如果数据库初始化失败：
1. 检查是否有写入权限到项目目录
2. 确保已安装 better-sqlite3 依赖
3. 手动运行数据库迁移：
```bash
npm run db:migrate
```

### Next.js 服务器启动失败
如果 Next.js 服务器启动失败：
1. 确保已安装 Next.js 依赖
2. 检查端口是否被占用
3. 尝试手动启动：
```bash
npx next start
```

### 浏览器无法自动打开
如果浏览器无法自动打开，CLI 会显示访问地址，你可以手动打开：
```
Investment Agent is running at http://localhost:3000
```

## 环境兼容性

本工具可在以下环境中运行：

### 项目目录环境
在包含 package.json 的项目根目录中运行：
```bash
npx investment-agent
```

### 独立安装环境
在任意目录中运行（会尝试以最小化模式运行）：
```bash
npx investment-agent
```

### 全局安装环境
```bash
npm install -g @alipay/investment-agent
investment-agent
```

## 开发

### 本地测试
```bash
# 链接到全局
npm link

# 测试 CLI
investment-agent

# 取消链接
npm unlink -g investment-agent
```

### 发布
```bash
npm publish
```

## 技术栈

- Node.js
- Next.js 16
- TypeScript
- Drizzle ORM
- SQLite
- CopilotKit
- LangChain
- LobeHub UI
