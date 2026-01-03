// lib/logger.js
import winston from 'winston';
import { getRequestContext } from './asyncStorage';
import util from 'util';
import { isProduction, isDevelopment, getProjectRoot } from './env';
import path from 'path';
import 'winston-daily-rotate-file';

export type Logger = winston.Logger;

// 创建自定义格式化器，添加请求 ID
const requestIdFormat = winston.format((info) => {
  const store = getRequestContext();
  if (store?.requestId) {
    info.requestId = store.requestId;
  } else {
    info.requestId = 'requestId';
  }
  return info;
});

const logDir = path.join(getProjectRoot(), 'logs');

// 创建文件传输配置
const fileTransports: winston.transport[] = [
  // new winston.transports.File({ filename: path.join(logDir, 'debug.log'), level: 'debug' }), // 输出到文件
  new winston.transports.DailyRotateFile({
    filename: path.join(logDir, 'web.log'),
    level: 'info',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    zippedArchive: true,
  }), // 输出到文件
  new winston.transports.DailyRotateFile({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    zippedArchive: true,
  }), // 输出到文件
];

// 创建控制台传输配置
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize({ all: true }), // 只给控制台添加颜色
  ),
});

// 根据环境变量选择传输方式
const transports: winston.transport[] = [...fileTransports];

// 在生产环境下，只有设置了 DEBUG 环境变量才输出到控制台
if (!isProduction() || process.env.DEBUG) {
  transports.unshift(consoleTransport);
}

// 创建 Logger 实例
const logger = winston.createLogger({
  level: isDevelopment() ? 'debug' : 'info',
  format: winston.format.combine(
    requestIdFormat(), // 添加请求 ID
    winston.format.splat(),
    // winston.format.align(), // 添加对齐
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    // winston.format.json(), // 日志格式为 JSON
    winston.format.printf((info) => {
      const { timestamp, level, message, requestId, ...args } = info;
      // const callerFile = getCallerFile();
      let formatMessage = `[${timestamp}][${requestId}][${level}]`;

      // 正确处理多参数情况
      if (Object.keys(args).length > 0) {
        // 将 message 和其他参数一起格式化
        const allArgs = [message, ...Object.values(args)];
        const formattedMessage = util.format(...allArgs);
        formatMessage += ` ${formattedMessage}`;
      } else {
        formatMessage += ` ${message}`;
      }

      return formatMessage;
    }),
  ),
  transports, // 使用环境变量选择的传输方式
});

export default logger;
