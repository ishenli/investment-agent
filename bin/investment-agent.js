#!/usr/bin/env node

const { spawn } = require('child_process');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

const DEFAULT_PORT = 3000;
const MAX_RETRIES = 30;
const RETRY_INTERVAL = 1000;

class InvestmentAgentCLI {
  constructor() {
    this.port = DEFAULT_PORT;
    this.serverProcess = null;
    // 获取当前脚本的目录作为基准路径
    this.scriptDir = path.dirname(__filename);
    // 尝试找到项目根目录
    this.projectRoot = this.findProjectRoot();

    console.log('Project root:', this.projectRoot);
  }

  findProjectRoot() {
    // 首先尝试从当前工作目录查找
    let currentDir = process.cwd();

    // 向上查找 package.json 文件
    while (currentDir !== path.dirname(currentDir)) {
      if (fs.existsSync(path.join(currentDir, 'package.json'))) {
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }

    // 如果没找到，尝试从脚本目录查找
    currentDir = this.scriptDir;
    while (currentDir !== path.dirname(currentDir)) {
      if (fs.existsSync(path.join(currentDir, 'package.json'))) {
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }

    // 如果都没找到，返回当前工作目录
    return process.cwd();
  }

  async start() {
    try {
      console.log('🚀 Starting Investment Agent...');

      // 检查项目依赖
      await this.checkDependencies();

      // 初始化数据库
      await this.initializeDatabase();

      // 启动 Next.js 开发服务器
      await this.startProdServer();

      // 等待服务器启动
      await this.waitForServer();

      // 自动打开浏览器
      await this.openBrowser();

      console.log(`✅ Investment Agent is running at http://localhost:${this.port}`);
      console.log('Press Ctrl+C to stop the server');

      // 处理退出信号
      this.handleExit();
    } catch (error) {
      console.error('❌ Failed to start Investment Agent:', error.message);
      process.exit(1);
    }
  }

  async checkDependencies() {
    console.log('📦 Checking dependencies...');

    // 检查 package.json 是否存在
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      console.log('⚠️  package.json not found in project root.');
      console.log('💡 This might be a standalone installation. Proceeding with minimal checks...');
      // 继续执行，不强制要求 package.json
    } else {
      // 检查 node_modules 是否存在
      const nodeModulesPath = path.join(this.projectRoot, 'node_modules');
      if (!fs.existsSync(nodeModulesPath)) {
        console.log('📥 Installing dependencies...');
        try {
          // 获取项目根目录
          const projectDir = this.projectRoot;

          // 优先使用本地安装的 npm
          const localNpm = path.join(projectDir, 'node_modules', '.bin', 'npm');

          if (fs.existsSync(localNpm)) {
            // 使用本地安装的 npm
            execSync(`"${localNpm}" install`, { stdio: 'inherit', cwd: projectDir });
          } else {
            // 使用全局 npm
            execSync('npm install', { stdio: 'inherit', cwd: projectDir });
          }
        } catch (error) {
          console.log('⚠️  Failed to install dependencies automatically.');
          console.log('💡 Please run "npm install" manually if you encounter issues.');
        }
      }
    }
  }

  async initializeDatabase() {
    console.log('🗄️ Initializing database...');

    try {
      // 获取项目根目录
      const projectDir = this.projectRoot;

      // 数据库文件路径
      const dbPath = path.join(projectDir, 'sqlite.db');

      // 检查数据库文件是否存在
      const dbExists = fs.existsSync(dbPath);

      if (dbExists) {
        console.log('✅ Database file already exists');
      } else {
        console.log('🆕 Creating new database file');
      }

      // 运行数据库迁移
      console.log('🔄 Running database migrations...');
      try {
        // 优先使用本地安装的 drizzle-kit
        const localDrizzleKit = path.join(projectDir, 'node_modules', '.bin', 'drizzle-kit');

        if (fs.existsSync(localDrizzleKit)) {
          // 使用本地安装的 drizzle-kit
          execSync(`"${localDrizzleKit}" migrate`, { stdio: 'inherit', cwd: projectDir });
        } else {
          // 尝试使用 npx
          try {
            execSync('npx drizzle-kit migrate', { stdio: 'inherit', cwd: projectDir });
          } catch (npxError) {
            // 如果 npx 失败，检查是否是全局安装的
            try {
              execSync('drizzle-kit --version', { stdio: 'ignore' });
              execSync('drizzle-kit migrate', { stdio: 'inherit', cwd: projectDir });
            } catch (globalError) {
              throw new Error(
                'Drizzle Kit not found. Please install it with "npm install drizzle-kit" or "npm install -g drizzle-kit"',
              );
            }
          }
        }
      } catch (migrateError) {
        console.log('⚠️  Failed to run database migrations automatically.');
        console.log(
          '💡 Please run "npm run db:migrate" manually if you encounter database issues.',
        );
        // 不抛出错误，继续执行
      }

      console.log('✅ Database initialization completed');
    } catch (error) {
      console.error('❌ Failed to initialize database:', error.message);
      // 不抛出错误，继续执行
    }
  }

  async startProdServer() {
    console.log('🔧 Starting development server...');

    return new Promise((resolve, reject) => {
      // 获取项目根目录
      const projectDir = this.projectRoot;

      // 优先使用本地安装的 next
      let nextCommand = 'npx';
      let nextArgs = ['next', 'start', '--port', this.port.toString()]; // 改为 dev 模式

      const localNext = path.join(projectDir, 'node_modules', '.bin', 'next');

      if (fs.existsSync(localNext)) {
        // 使用本地安装的 next
        nextCommand = localNext;
        nextArgs = ['start', '--port', this.port.toString()]; // 改为 dev 模式
        console.log('🔧 Using local Next.js installation');
      } else {
        // 检查是否安装了 next 命令
        try {
          execSync('npx next --version', { stdio: 'ignore' });
          console.log('🔧 Using npx to run Next.js');
        } catch (error) {
          console.log('⚠️  Next.js not found in current environment.');
          console.log('💡 Please install Next.js with "npm install next"');
          reject(new Error('Next.js not found. Please install it with "npm install next"'));
          return;
        }
      }

      const nextDev = spawn(nextCommand, nextArgs, {
        stdio: 'pipe', // 改为 pipe 以便监听输出
        shell: true,
        env: {
          ...process.env,
          PORT: this.port.toString(),
        },
        cwd: projectDir,
      });

      this.serverProcess = nextDev;

      nextDev.on('error', (error) => {
        console.error('❌ Failed to start dev server:', error.message);
        reject(new Error(`Failed to start dev server: ${error.message}`));
      });

      // 监听服务器启动信息
      nextDev.stdout?.on('data', (data) => {
        const output = data.toString();
        // 输出到控制台
        process.stdout.write(data);
        // 当看到 Next.js 启动完成的消息时，resolve promise
        if (
          output.includes('Local:') ||
          output.includes('Ready in') ||
          output.includes('✓') ||
          output.includes('started server on')
        ) {
          resolve();
        }
      });

      // 监听错误输出
      nextDev.stderr?.on('data', (data) => {
        const output = data.toString();
        process.stderr.write(data);
        // 如果看到端口被占用的错误，提供更友好的提示
        if (output.includes('EADDRINUSE')) {
          console.error(`\n❌ Port ${this.port} is already in use.`);
          console.error('💡 Please use a different port with --port option.');
        }
      });

      // 监听进程退出
      nextDev.on('close', (code) => {
        if (code !== 0 && code !== null) {
          console.error(`\n❌ Dev server exited with code ${code}`);
          reject(new Error(`Dev server exited with code ${code}`));
        }
      });
    });
  }

  async waitForServer() {
    console.log('⏳ Waiting for server to be ready...');

    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        await new Promise((resolve, reject) => {
          const req = http.request(
            {
              hostname: 'localhost',
              port: this.port,
              path: '/',
              method: 'GET',
              timeout: 2000,
            },
            (res) => {
              // Next.js 服务启动后可能会返回 200、404 或其他状态码
              // 只要能成功连接就认为服务器已就绪
              if (res.statusCode >= 200 && res.statusCode < 500) {
                resolve();
              } else {
                reject(new Error(`Server returned status ${res.statusCode}`));
              }
            },
          );

          req.on('error', reject);
          req.on('timeout', () => reject(new Error('Request timeout')));
          req.end();
        });

        console.log('✅ Server is ready!');
        return;
      } catch (error) {
        // 修复错误条件判断
        if (i === MAX_RETRIES - 1) {
          throw new Error('Server failed to start within expected time');
        }
        await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL));
      }
    }
  }

  async openBrowser() {
    console.log('🌐 Opening browser...');

    const url = `http://localhost:${this.port}`;

    // 跨平台打开浏览器
    const { spawn } = require('child_process');

    try {
      let command;
      const args = [url];

      switch (process.platform) {
        case 'darwin': // macOS
          command = 'open';
          break;
        case 'win32': // Windows
          command = 'start';
          break;
        case 'linux': // Linux
          command = 'xdg-open';
          break;
        default:
          console.log(`Please open ${url} in your browser`);
          return;
      }

      spawn(command, args, { stdio: 'ignore', detached: true });
    } catch (error) {
      console.log(`Please open ${url} in your browser`);
    }
  }

  handleExit() {
    const cleanup = () => {
      console.log('\n🛑 Shutting down Investment Agent...');

      if (this.serverProcess) {
        this.serverProcess.kill('SIGTERM');
      }

      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  }
}

// 处理命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--port' || arg === '-p') {
      const port = parseInt(args[i + 1]);
      if (port && port > 0 && port < 65536) {
        options.port = port;
        i++;
      } else {
        console.error('Invalid port number');
        process.exit(1);
      }
    } else if (arg === '--no-open') {
      options.noOpen = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Investment Agent CLI

Usage:
  investment-agent [options]
  npx investment-agent [options]

Options:
  -p, --port <port>    Set the port number (default: 3000)
  --no-open           Don't open browser automatically
  -h, --help          Show this help message

Examples:
  investment-agent
  investment-agent --port 4000
  investment-agent --no-open
  npx investment-agent
  npx investment-agent --port 4000
  npx investment-agent --no-open

Notes:
  - If package.json is not found, the tool will attempt to run with minimal checks
  - Database will be automatically initialized if not exists
  - Works in both project directories and standalone installations
`);
      process.exit(0);
    }
  }

  return options;
}

// 主程序
if (require.main === module) {
  const options = parseArgs();
  const cli = new InvestmentAgentCLI();

  if (options.port) {
    cli.port = options.port;
  }

  if (options.noOpen) {
    cli.openBrowser = async () => {
      console.log(`🌐 Server is ready at http://localhost:${cli.port}`);
    };
  }

  cli.start().catch(console.error);
}

module.exports = InvestmentAgentCLI;
