#!/usr/bin/env node

const { spawn } = require('child_process');
const { execSync } = require('child_process');
const { exec } = require('child_process');
const os = require('os');
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
    // 初始化用户数据目录
    this.dataDir = this.initDataDirectory();

    // 设置环境变量，指向用户数据目录
    process.env.INVESTMENT_AGENT_DATA_DIR = this.dataDir;
    process.env.PROJECT_DIR = this.dataDir;

    console.log('Project root:', this.projectRoot);
    console.log('Data directory:', this.dataDir);
  }

  initDataDirectory() {
    // 获取用户主目录
    const homeDir = os.homedir();
    const dataDir = path.join(homeDir, '.investment-agent');

    // 确保目录存在
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('Created data directory:', dataDir);
    }

    return dataDir;
  }

  findProjectRoot() {
    // 1. 检查是否在 standalone 模式下运行
    const standaloneServerPath = path.join(this.scriptDir, '..', '.next', 'standalone');
    if (fs.existsSync(standaloneServerPath)) {
      return standaloneServerPath;
    }

    // 2. 首先尝试从当前工作目录查找
    let currentDir = process.cwd();

    // 向上查找 package.json 文件
    while (currentDir !== path.dirname(currentDir)) {
      if (fs.existsSync(path.join(currentDir, 'package.json'))) {
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }

    // 3. 如果没找到，尝试从脚本目录查找
    currentDir = this.scriptDir;
    while (currentDir !== path.dirname(currentDir)) {
      if (fs.existsSync(path.join(currentDir, 'package.json'))) {
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }

    // 4. 如果都没找到，返回当前工作目录
    return process.cwd();
  }

  async start() {
    try {
      console.log('🚀 Starting Investment Agent...');

      // 检查项目依赖
      await this.checkDependencies();

      // 初始化数据库
      await this.initializeDatabase();

      // 启动 Next.js 生产服务器
      await this.startServer();

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

    // 检查是否在 standalone 模式
    const standaloneServerPath = path.join(this.scriptDir, '..', '.next', 'standalone');
    if (fs.existsSync(standaloneServerPath)) {
      console.log('✅ Running in standalone mode, dependencies already bundled');
      return;
    }

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
      // 数据库文件路径（在用户数据目录）
      const dbPath = path.join(this.dataDir, 'sqlite.db');

      console.log('Database path:', dbPath);

      // 检查数据库文件是否存在并且是否已经初始化（有表）
      const dbExists = fs.existsSync(dbPath);
      const dbInitialized = dbExists && fs.statSync(dbPath).size > 0;

      if (dbInitialized) {
        console.log('✅ Database already initialized');
        return;
      }

      // 运行数据库迁移
      console.log('🔄 Running database migrations...');

      // 直接执行 SQL 迁移文件
      const migrationDir = path.join(this.scriptDir, '..', 'drizzle', 'migrations');

      if (!fs.existsSync(migrationDir)) {
        console.log('⚠️  Migration directory not found:', migrationDir);
        return;
      }

      // 读取所有迁移文件并按顺序执行
      const migrationFiles = fs.readdirSync(migrationDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

      if (migrationFiles.length === 0) {
        console.log('⚠️  No migration files found');
        return;
      }

      // 使用 better-sqlite3 直接执行 SQL
      const Database = require('better-sqlite3');
      const db = new Database(dbPath);

      // 创建迁移记录表（如果不存在）
      db.exec(`
        CREATE TABLE IF NOT EXISTS __drizzle_migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          hash TEXT NOT NULL,
          created_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
      `);

      // 执行每个迁移文件
      for (const file of migrationFiles) {
        const filePath = path.join(migrationDir, file);
        const sql = fs.readFileSync(filePath, 'utf-8');

        // 检查是否已执行过
        const fileHash = require('crypto').createHash('md5').update(sql).digest('hex');
        const existingMigration = db.prepare('SELECT * FROM __drizzle_migrations WHERE hash = ?').get(fileHash);

        if (existingMigration) {
          console.log(`  ✓ Migration ${file} already applied`);
          continue;
        }

        try {
          console.log(`  → Applying migration ${file}...`);
          db.exec(sql);

          // 记录迁移
          db.prepare('INSERT INTO __drizzle_migrations (hash) VALUES (?)').run(fileHash);
          console.log(`  ✓ Applied migration ${file}`);
        } catch (sqlError) {
          console.log(`  ⚠️  Failed to apply migration ${file}:`, sqlError.message);
          throw sqlError;
        }
      }

      db.close();

      console.log('✅ Database initialization completed');

      // 初始化默认用户
      await this.initializeDefaultUser();
    } catch (error) {
      console.error('❌ Failed to initialize database:', error.message);
      throw error;
    }
  }

  async initializeDefaultUser() {
    console.log('👤 Initializing default user...');

    try {
      const dbPath = path.join(this.dataDir, 'sqlite.db');
      const Database = require('better-sqlite3');
      const db = new Database(dbPath);

      // 检查是否已经有用户
      const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
      if (userCount.count > 0) {
        console.log('✅ Default user already exists');
        db.close();
        return;
      }

      // 插入默认用户
      const result = db.prepare(`
        INSERT INTO users (username, email, password_hash, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('admin', 'admin@investment-agent.local', 'placeholder_hash', new Date().toISOString(), new Date().toISOString());

      console.log(`✅ Default user created with ID: ${result.lastInsertRowid}`);
      console.log('   Username: admin');
      console.log('   Email: admin@investment-agent.local');

      db.close();
    } catch (error) {
      console.error('❌ Failed to initialize default user:', error.message);
      throw error;
    }
  }

  async startServer() {
    console.log('🔧 Starting server...');

    return new Promise((resolve, reject) => {
      // 检查是否使用 standalone 模式
      const standaloneServerPath = path.join(this.scriptDir, '..', '.next', 'standalone', 'server.js');

      let serverPath, serverArgs = [];

      if (fs.existsSync(standaloneServerPath)) {
        // 使用 standalone 服务器
        serverPath = process.execPath; // 使用当前 node
        serverArgs = [standaloneServerPath];
        console.log('🔧 Using standalone Next.js server');
      } else {
        // 回退到 next start
        const projectDir = this.projectRoot;
        let nextCommand = 'npx';
        let nextArgs = ['next', 'start', '--port', this.port.toString()];

        const localNext = path.join(projectDir, 'node_modules', '.bin', 'next');

        if (fs.existsSync(localNext)) {
          // 使用本地安装的 next
          nextCommand = localNext;
          nextArgs = ['start', '--port', this.port.toString()];
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

        serverPath = nextCommand;
        serverArgs = nextArgs;
      }

      const cwd = fs.existsSync(standaloneServerPath)
        ? path.dirname(standaloneServerPath)
        : this.projectRoot;

      const serverProcess = spawn(serverPath, serverArgs, {
        stdio: 'pipe', // 改为 pipe 以便监听输出
        shell: true,
        env: {
          ...process.env,
          PORT: this.port.toString(),
          NODE_ENV: 'production',
          INVESTMENT_AGENT_DATA_DIR: this.dataDir,
          PROJECT_DIR: this.dataDir,
        },
        cwd,
      });

      this.serverProcess = serverProcess;

      serverProcess.on('error', (error) => {
        console.error('❌ Failed to start server:', error.message);
        reject(new Error(`Failed to start server: ${error.message}`));
      });

      // 监听服务器启动信息
      serverProcess.stdout?.on('data', (data) => {
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
      serverProcess.stderr?.on('data', (data) => {
        const output = data.toString();
        process.stderr.write(data);
        // 如果看到端口被占用的错误，提供更友好的提示
        if (output.includes('EADDRINUSE')) {
          console.error(`\n❌ Port ${this.port} is already in use.`);
          console.error('💡 Please use a different port with --port option.');
        }
      });

      // 监听进程退出
      serverProcess.on('close', (code) => {
        if (code !== 0 && code !== null) {
          console.error(`\n❌ Server exited with code ${code}`);
          reject(new Error(`Server exited with code ${code}`));
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
  ig [options]

Options:
  -p, --port <port>    Set the port number (default: 3000)
  --no-open           Don't open browser automatically
  -h, --help          Show this help message

Examples:
  investment-agent
  investment-agent --port 4000
  investment-agent --no-open
  ig
  ig --port 4000
  ig --no-open

Notes:
  - Database is stored in ~/.investment-agent
  - Automatically runs database migrations on startup
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