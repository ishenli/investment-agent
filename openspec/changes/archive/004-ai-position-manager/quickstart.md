# AI 仓位管理器 - 快速启动指南

## 🚀 3分钟快速上手

### 1. 环境验证

在`feature/ai-position-manager`分支下执行以下命令：

```bash
# 验证所有必要组件就绪
make position-dev-setup
# 预期输出：✅ Position store ready  ✅ Charting libraries configured  ✅ Test positions seeded
```

如果发现缺失组件，运行：

```bash
npm run setup:position-modules
```

### 2. 第一次风险洞察查看

通过三种方式体验功能：

#### 选项A: 网页端测试

访问: `http://localhost:3000/position-manager/test`

- 预期显示：实时的仓位风险洞察仪表盘，包含集中度、资产配置、相关性、流动性冲击四大维度
- 交互测试：切换"散户模式"和"进阶模式"，验证阈值变化

#### 选项B: API直连测试

```bash
curl -X GET http://localhost:3000/api/position/portfolio \
  -H "Content-Type: application/json"
```

#### 选项C: VSCode快捷测试

快捷键：`Ctrl+Shift+P` → 输入 "Run Position Manager Test"

### 3. 核心功能验证

按部就班验证四个关键场景：

| 测试场景     | 用户操作示例                     | 期望功能响应                         |
| ------------ | -------------------------------- | ------------------------------------ |
| **风险洞察** | 打开仓位管理器页面               | 显示四大维度风险评分和可视化图表     |
| **模式切换** | 点击设置切换风险评估模式         | 所有图表、预警文案、颜色同步更新     |
| **智能提醒** | 模拟单笔买入导致集中度超标       | 弹出预警窗口 + 仪表盘即时刷新        |
| **分散建议** | 触发高风险情况                   | 生成并显示个性化分散投资建议         |

### 4. 开发调试技巧

#### 实时查看风险数据

```bash
npm run position:monitor
# 实时监控仓位变化和风险评分更新
```

#### 重置测试环境

```bash
npm run position:reset-test-data
# 清理测试仓位，重置风险历史数据
```

#### 性能诊断

```bash
npm run position:benchmark
# 测试仪表盘更新响应时间<1秒要求
```

---

## 📋 开发工作流程

### 第1步: 功能分支确认

```bash
git branch
# 确保已在 feature/ai-position-manager 分支
git status
# 确认changes已提交
```

### 第2步: 快速迭代验证

使用提供的测试套件循环验证：

```bash
# 运行仓位管理功能测试
npm test position-api-tests.spec.ts

# 检查实时数据更新功能
npm test position-realtime-updates.spec.ts

# 验证风险计算准确性
npm test position-risk-calculations.spec.ts
```

### 第3步: 边界情况测试

```bash
# 空仓位处理
npm test position-empty-portfolio.spec.ts

# 极端市场情况
npm test position-edge-cases.spec.ts

# 离线模式
npm test position-offline-mode.spec.ts
```

---

## 🎯 立即开始开发

### 地面开发模板

```typescript
// 文件: src/app/components/position-manager/RiskDashboard.tsx
// 起点：复制现有的Dashboard组件逻辑
// 核心：集成PositionStore获取实时仓位数据
// 注意：确保所有风险计算符合监管要求
```

### 测试驱动开发(TDD)循环

遵循投资代理宪法中的**Test-First Development**：

1. **红阶段** (失败测试): 查看失败的测试用例
2. **绿阶段** (最小功能): 实现代码使测试通过
3. **重构阶段** (优化): 改善实现方式

```bash
# 运行测试查看失败情况
npm test position-tdd-red.spec.ts

# 实现最小可行功能
npm dev && npm test

# 验证所有测试通过
npm test position-tdd-green.spec.ts
```

---

## 🛠️ 高级功能开发

### 风险计算引擎

```typescript
// 核心接口：风险计算引擎
interface RiskCalculationEngine {
  calculateConcentrationRisk: (positions: Position[]) => ConcentrationRiskScore;
  calculateCorrelationRisk: (positions: Position[]) => CorrelationRiskScore;
  calculateLiquidityRisk: (positions: Position[]) => LiquidityRiskScore;
  calculateAllocationRisk: (positions: Position[]) => AllocationRiskScore;
}
```

### AI代理集成

```typescript
// 集成AI代理进行风险评估和建议生成
configureAIAgents({
  riskAnalyst: 'PositionRiskAnalystAgent',
  recommendationEngine: 'DiversificationRecommendationAgent',
  strategyAdvisor: 'PortfolioStrategyAgent',
});
```

---

## 📞 遇到问题？

出现以下情况时的排查路径：

| 问题类型 | 关键词搜索                    | 解决方案指引                                        |
| -------- | ----------------------------- | --------------------------------------------------- |
| 权限错误 | "IndexedDB access denied"     | [浏览器隐私模式检查](/docs/privacy-mode-setup.md)   |
| 数据错误 | "Risk calculation failed"     | [风险计算逻辑验证](../002-asset-management/data-model.md) |
| 测试失败 | "Chart rendering timeout"     | 图表库配置或性能检查                                |

或通过命令行快速检查：

```bash
npm run check:position-health
# 输出系统健康状态报告