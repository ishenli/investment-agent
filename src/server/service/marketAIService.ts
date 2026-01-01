import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import logger from '@server/base/logger';
import { chatModelOpenAI } from '../core/provider/chatModel';

/**
 * 市场AI服务接口
 */
export interface IMarketAIService {
  /**
   * 总结内容
   * @param content 内容
   * @param title 标题（可选）
   * @param language 语言（可选，默认为中文）
   * @returns 总结结果
   */
  summarizeContent(
    content: string,
    title?: string,
    language?: string,
  ): Promise<Record<string, any>>;

  /**
   * 分析内容
   * @param content 内容
   * @param title 标题（可选）
   * @param language 语言（可选，默认为中文）
   * @returns 分析结果
   */
  analyzeContent(content: string, title?: string, language?: string): Promise<Record<string, any>>;
}

/**
 * 市场AI服务实现类
 */
export class MarketAIService implements IMarketAIService {
  private chatModel: ChatOpenAI;

  constructor() {
    // 初始化LangChain Chat模型
    this.chatModel = chatModelOpenAI('Qwen3-Next-80B-A3B-Instruct');
  }

  /**
   * 总结内容
   * @param content 内容
   * @param title 标题（可选）
   * @param language 语言（可选，默认为中文）
   * @returns 总结结果
   */
  async summarizeContent(
    content: string,
    title?: string,
    language: string = 'zh',
  ): Promise<Record<string, any>> {
    logger.info('[MarketAIService] 开始AI总结内容');

    try {
      // 构建系统提示
      const systemPrompt = this.buildSummarySystemPrompt(language);

      // 构建用户提示
      const userPrompt = this.buildSummaryUserPrompt(content, title);

      // 调用LangChain模型
      const response = await this.chatModel.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ]);

      // 解析响应
      const summaryResult = this.parseSummaryResponse(response.content.toString(), language);

      logger.info('[MarketAIService] AI总结内容成功');
      return summaryResult;
    } catch (error) {
      logger.error(
        '[MarketAIService] AI总结内容失败: %s',
        error instanceof Error ? error.message : String(error),
      );
      throw new Error(`AI总结内容失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 分析内容
   * @param content 内容
   * @param title 标题（可选）
   * @param language 语言（可选，默认为中文）
   * @returns 分析结果
   */
  async analyzeContent(
    content: string,
    title?: string,
    language: string = 'zh',
  ): Promise<Record<string, any>> {
    logger.info('[MarketAIService] 开始AI分析内容');

    try {
      // 构建系统提示
      const systemPrompt = this.buildAnalysisSystemPrompt(language);

      // 构建用户提示
      const userPrompt = this.buildAnalysisUserPrompt(content, title);

      // 调用LangChain模型
      const response = await this.chatModel.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ]);

      // 解析响应
      const analysisResult = this.parseAnalysisResponse(response.content.toString(), language);

      logger.info('[MarketAIService] AI分析内容成功');
      return analysisResult;
    } catch (error) {
      logger.error(
        '[MarketAIService] AI分析内容失败: %s',
        error instanceof Error ? error.message : String(error),
      );
      throw new Error(`AI分析内容失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 构建总结系统提示
   * @param language 语言
   * @returns 系统提示
   */
  private buildSummarySystemPrompt(language: string): string {
    if (language === 'en') {
      return `You are an AI assistant specialized in summarizing financial market information.
Your task is to create concise, informative summaries of market news and analysis.
Focus on the key points, main trends, and important data.
Keep the summary clear and objective.
Respond with a JSON object containing a "summary" field with the summary text.`;
    } else {
      return `你是一个专门总结金融市场信息的AI助手。
你的任务是为市场新闻和分析创建简洁、信息丰富的摘要。
重点关注要点、主要趋势和重要数据。
保持摘要清晰客观。
请回复一个包含"summary"字段的JSON对象，其中包含摘要文本。`;
    }
  }

  /**
   * 构建总结用户提示
   * @param content 内容
   * @param title 标题（可选）
   * @returns 用户提示
   */
  private buildSummaryUserPrompt(content: string, title?: string): string {
    let prompt = `请为以下内容生成摘要：\n\n`;

    if (title) {
      prompt += `标题: ${title}\n\n`;
    }

    prompt += `内容:\n${content}\n\n`;
    prompt += `请提供一个简洁明了的摘要，突出关键信息和主要观点。`;

    return prompt;
  }

  /**
   * 解析总结响应
   * @param response 响应内容
   * @param language 语言
   * @returns 解析后的结果
   */
  private parseSummaryResponse(response: string, language: string): Record<string, any> {
    try {
      // 尝试解析JSON响应
      const parsedResponse = JSON.parse(response);

      // 返回包含摘要的结果
      return {
        summary: parsedResponse.summary || response.trim(),
        language: language,
        timestamp: new Date().toISOString(),
      };
    } catch (parseError) {
      // 如果JSON解析失败，返回包含原始响应的结果
      logger.warn(
        '[MarketAIService] 总结响应JSON解析失败，使用原始响应: %s',
        parseError instanceof Error ? parseError.message : String(parseError),
      );

      return {
        summary: response.trim(),
        language: language,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 构建分析系统提示
   * @param language 语言
   * @returns 系统提示
   */
  private buildAnalysisSystemPrompt(language: string): string {
    return `你是一个专门分析金融市场信息的AI助手。
你的任务是分析市场新闻并提供特定JSON格式的见解。

### 基础要求
+ 如果文章包含「观点」、「判断」等一些关键信息术语必须包含
+ 每个季度的财报基础信息必须包含，比如营收、利润、调整净利润、每股收益等关键数据。
+ 资产标识是股票的代码、ETF 代码或者公司英文简称，比如 AAPL、01810等
+ 你必须只返回有效的JSON，不要包含任何其他文本。

### 所需的JSON结构为：
{
  "title": "string - 内容的简洁标题",
  "symbol": "string - 资产标识（比如 AAPL、01810[小米]等）",
  "sentiment": "string - 投资判断（积极、消极、中性）",
  "importance": "number - 重要性评级（1-10）",
  "summary": "string - 内容的简洁摘要",
  "keyTopics": ["string"] - 关键主题或趋势数组（最多5个）,
  "marketImpact": "string - 潜在市场影响评估，重点关注业务的潜在增长空间以及潜在亏损等关键场景，比如收入、成本以及利润在未来后续的影响",
  "keyDataPoints": ["string"] - 重要数据点或数字数组
}`;
  }

  /**
   * 构建分析用户提示
   * @param content 内容
   * @param title 标题（可选）
   * @returns 用户提示
   */
  private buildAnalysisUserPrompt(content: string, title?: string): string {
    let prompt = `请分析以下内容并以指定的JSON格式返回结果：\n\n`;

    if (title) {
      prompt += `标题: ${title}\n\n`;
    }

    prompt += `内容:\n${content.substring(0, 4000)}\n\n`;
    prompt += `请严格按照上述JSON格式提供结构化分析，包括标题、资产标识、投资判断、重要性评级（1-10）、内容摘要、关键主题（最多5个）、市场影响评估和重要数据点。`;

    return prompt;
  }

  /**
   * 解析分析响应
   * @param response 响应内容
   * @param language 语言
   * @returns 解析后的结果
   */
  private parseAnalysisResponse(response: string, language: string): Record<string, any> {
    try {
      // 尝试解析JSON响应
      const parsedResponse = JSON.parse(response);

      // 验证必要的字段
      const analysisResult = {
        title: parsedResponse.title || '未提取到标题',
        sentiment: parsedResponse.sentiment || '未知',
        importance: parsedResponse.importance || 5,
        summary: parsedResponse.summary || '未生成摘要',
        keyTopics: Array.isArray(parsedResponse.keyTopics) ? parsedResponse.keyTopics : [],
        marketImpact: parsedResponse.marketImpact || '未评估',
        keyDataPoints: Array.isArray(parsedResponse.keyDataPoints)
          ? parsedResponse.keyDataPoints
          : [],
        language: language,
        timestamp: new Date().toISOString(),
      };

      return analysisResult;
    } catch (parseError) {
      // 如果JSON解析失败，返回包含原始响应的结果
      logger.warn(
        '[MarketAIService] 分析响应JSON解析失败，使用原始响应: %s',
        parseError instanceof Error ? parseError.message : String(parseError),
      );

      return {
        title: '解析失败',
        sentiment: '未知',
        importance: 5,
        summary: response.substring(0, 200),
        keyTopics: [],
        marketImpact: '未评估',
        keyDataPoints: [],
        language: language,
        timestamp: new Date().toISOString(),
        rawResponse: response,
      };
    }
  }
}
