# Change: 添加定时任务系统（前端触发）

## Why

当前系统缺乏自动化的数据同步和快照创建机制，导致：
1. 资产价格历史数据需要手动同步，无法定期自动记录每日收盘价
2. 投资组合快照需要手动创建，无法追溯历史表现
3. 用户必须记得定期执行初始化操作才能获取最新数据

作为一个 Electron 客户端应用，传统的服务端定时任务方案（如 cron）不适用，需要一种适合客户端应用的定时任务架构。

## What Changes

### 新增功能
- **启动检查机制**：应用启动时自动检查遗漏的任务（昨天/今天未执行的任务）并补执行
- **后台定时检查**：应用运行期间每小时检查是否需要执行新任务
- **任务执行状态追踪**：记录任务执行历史，避免重复执行
- **两个核心定时任务**：
  1. 价格历史同步：遍历所有持仓股票，同步每日收盘价数据（OHLC）
  2. 投资组合快照：为所有账户创建每日快照，记录持仓状态

### 技术方案
- 采用**前端触发**方案，在 Next.js 服务进程内实现调度逻辑
- 利用已有的 `HistoryService` 和 `PortfolioSnapshotService`
- 新增 `SchedulerService` 统一管理调度逻辑
- 新增 `scheduledTaskLogs` 表记录执行状态

## Impact

- Affected specs: 新增 `scheduled-tasks` capability
- Affected code:
  - `src/server/service/schedulerService.ts` (新增)
  - `src/app/api/scheduled/route.ts` (新增)
  - `src/server/lib/db.ts` (扩展初始化逻辑)
  - `drizzle/schema.ts` (新增 scheduledTaskLogs 表)