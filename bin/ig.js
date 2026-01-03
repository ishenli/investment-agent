#!/usr/bin/env node

// ig 是 investment-agent 的简写命令
// 直接调用主脚本，但传递所有参数
const { spawn } = require('child_process');
const path = require('path');

// 调用 investment-agent.js
const cliPath = path.join(__dirname, 'investment-agent.js');
const args = process.argv.slice(2); // 跳过 node 和 ig.js 本身的参数

// 执行 investment-agent.js
spawn(process.execPath, [cliPath, ...args], { stdio: 'inherit' }).on('exit', (code) => {
  process.exit(code);
});