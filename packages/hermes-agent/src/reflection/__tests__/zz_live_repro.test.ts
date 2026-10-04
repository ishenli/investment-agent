import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { ReflectionAuditor } from '../../index';
import { resolveAgentModel } from '@server/service/agentModelResolver';

describe('debug live follow-up repro', () => {
  it('runs generation for the exact topic conversation', async () => {
    const userMsg =
      '阿里巴巴的千问事业部是什么?';
    const assistantReply = `Let me search for information about Alibaba's Qwen division.Let me try the web search again with a different approach.Let me try Tavily search instead.基于搜索结果，我来为您详细解答阿里巴巴的千问事业部。

## 阿里巴巴千问事业部

千问事业部（实际上是**千问C端事业群**）是阿里巴巴集团在AI时代战略布局的重要组织单元，具体情况如下：

### 核心信息

- **成立时间**：2025年12月9日
- **负责人**：阿里巴巴集团副总裁 **吴嘉**
- **组成来源**：由原**智能信息事业群**与**智能互联事业群**合并重组而来
- **核心业务**：千问APP、夸克、AI硬件、UC、书旗等

### 定位与目标

千问C端事业群的首要目标，是将**千问**打造成一款**超级APP**，成为 **AI时代用户的第一入口**。未来还计划将千问打造为覆盖**眼镜、PC、汽车**等场景的无所不在的AI助手。

### 背景与演变

千问的前身是"**通义App**"，经历了多次组织的调整：

1. **早期**：通义App隶属于阿里云事业部，作为通义千问模型的副产品展示模型能力，资源投入有限
2. **2024年**：伴随吴嘉回归，通义App从阿里云划归到智能信息事业群，与夸克并列
3. **2025年**：集团CEO吴泳铭决断——阿里巴巴必须有一个**AI原生的C端超级入口**，启动千问项目，从北京、广东调来上百名工程师集中攻关
4. **2025年11月17日**：千问App正式上线公测，定位为"会聊天、能办事"的个人AI助手，目标与ChatGPT全面竞争，上线次日冲入苹果App Store免费榜第五位
5. **2025年12月**：正式成立千问C端事业群，将其作为集团战略级项目

### 技术层面

千问App底座采用阿里巴巴开源的**Qwen（通义千问）大模型**，产品方向上由夸克团队和通义实验室一起做定制化模型训练与优化。阿里已计划在2025-2027财年累计投入超 **3800亿元** 用于云和AI基础设施建设。

---

**简单总结**：千问事业部是阿里为全力冲刺C端AI市场而设立的战略级事业群，把千问App（对标ChatGPT）、夸克浏览器、AI硬件等业务整合在一起，目标是打造AI时代的超级入口。这反映了阿里从B端云+模型优先，向C端消费者AI产品全面发力的一次重大组织变革。

如果您是股票投资者，想进一步了解阿里巴巴的AI战略对其投资价值的看法，我可以帮您查询相关数据和笔记，或者做个简单的分析。需要吗？`;

    const { model, apiKey } = await resolveAgentModel(1, 'ant', 'DeepSeek-V4-Flash-0731');
    const auditor = new ReflectionAuditor(
      path.join(
        process.cwd(),
        'packages/hermes-agent/src/reflection/frameworks/investment-analysis.json',
      ),
    );
    const domainRelevant = await auditor.isDomainRelevant([userMsg, assistantReply]);
    const items = await auditor.generateFollowUpQuestions(model, [userMsg], assistantReply, {
      apiKey,
      maxTokens: 800,
    });
    console.log('[repro] domainRelevant=', domainRelevant, 'itemsCount=', items.length);
    console.log('[repro] items=', JSON.stringify(items, null, 2));
    expect(true).toBe(true);
  });
});