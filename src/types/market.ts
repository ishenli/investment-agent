// 市场信息抓取工具的类型定义

/**
 * 市场信息状态枚举
 */
export enum MarketInformationStatus {
  PENDING = 'PENDING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
}

/**
 * 数据源类型枚举
 */
export enum DataSourceType {
  WEB = 'WEB',
  WECHAT_MP = 'WECHAT_MP',
  FUTU_NEWS = 'FUTU_NEWS',
}

/**
 * 内容格式枚举
 */
export enum ContentFormat {
  TEXT = 'TEXT',
  MARKDOWN = 'MARKDOWN',
}

/**
 * 数据源引用接口
 */
export interface DataSourceReference {
  id: string;
  type: DataSourceType;
  name: string;
}

/**
 * 市场信息接口
 */
export interface MarketInformation {
  id: string;
  content: string;
  source: DataSourceReference;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  metadata: Record<string, any>;
  status: MarketInformationStatus;
  encrypted: boolean;
  format?: ContentFormat;
}

/**
 * 数据源接口
 */
export interface DataSource {
  id: string;
  type: DataSourceType;
  name: string;
  config: Record<string, any>;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 缓存存储接口
 */
export interface CacheStorage {
  path: string;
  maxSize: number;
  currentSize: number;
  fileCount: number;
  lastCleanup: Date;
}

/**
 * 网页抓取请求接口
 */
export interface CrawlRequest {
  url: string;
  dataSourceType?: DataSourceType;
}

/**
 * 手动录入请求接口
 */
export interface ManualInputRequest {
  content: string;
  format: ContentFormat;
  tags?: string[];
}

/**
 * API响应接口
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
