'use client';

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Badge } from '@renderer/components/ui/badge';
import { Skeleton } from '@renderer/components/ui/skeleton';
import { Progress } from '@renderer/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@renderer/components/ui/table';
import { Button } from '@renderer/components/ui/button';
import { IconChevronRight, IconAlertTriangle, IconBulb, IconTrash, IconExternalLink } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { get, del } from '@/app/lib/request';

interface ScorerResult {
  id: number;
  name: string;
  dimension: string;
  score: number;
  passed: boolean;
  reason: string;
}

interface CaseResult {
  id: number;
  caseId: string;
  category: string;
  passed: boolean;
  score: number;
  dimensionScores: string;
  runRecord: string;
  scorers: ScorerResult[];
}

interface RunDetail {
  run: {
    id: string;
    engine: string;
    categories: string;
    status: string;
    score: number;
    totalCases: number;
    passedCases: number;
    failedCases: number;
    threshold: number;
    createdAt: string;
  };
  cases: CaseResult[];
}

interface EvalResultViewProps {
  runId: string;
  onDeleted?: () => void;
}

export function EvalResultView({ runId, onDeleted }: EvalResultViewProps) {
  const { t } = useTranslation('setting');
  const [detail, setDetail] = React.useState<RunDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [deleting, setDeleting] = React.useState(false);
  const [expandedCases, setExpandedCases] = React.useState<Set<string>>(new Set());

  const DIMENSION_LABELS: Record<string, string> = {
    mission: t('evaluation.result.dimensions.mission'),
    action: t('evaluation.result.dimensions.action'),
    context: t('evaluation.result.dimensions.context'),
    execution: t('evaluation.result.dimensions.execution'),
    ethics: t('evaluation.result.dimensions.ethics'),
  };

  React.useEffect(() => {
    setLoading(true);
    setDetail(null);
    get(`/api/evaluation/${runId}`)
      .then((result) => {
        setDetail(result.data ?? null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [runId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (!detail) {
    return <p className="text-center text-muted-foreground py-8">{t('evaluation.result.notFound')}</p>;
  }

  const { run, cases } = detail;

  const dimensionScoresAgg = computeDimensionAverages(cases);
  const suggestions = generateSuggestions(cases, run.threshold);

  const handleDelete = async () => {
    if (!window.confirm(t('evaluation.result.deleteConfirm'))) return;
    setDeleting(true);
    try {
      await del(`/api/evaluation/${runId}`);
      onDeleted?.();
    } catch (error) {
      console.error('Failed to delete run:', error);
    } finally {
      setDeleting(false);
    }
  };

  const toggleCase = (caseId: string) => {
    setExpandedCases((prev) => {
      const next = new Set(prev);
      if (next.has(caseId)) next.delete(caseId);
      else next.add(caseId);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t('evaluation.result.title')}</span>
            <div className="flex items-center gap-2">
              <Badge variant={run.status === 'completed' ? 'default' : 'destructive'}>
                {run.status}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                className="text-muted-foreground hover:text-destructive"
              >
                <IconTrash className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            {t('evaluation.config.engine')}: {run.engine} | {t('evaluation.config.threshold')}: {run.threshold} | {t('evaluation.history.table.time')}: {new Date(run.createdAt).toLocaleString('zh-CN')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{run.score.toFixed(3)}</div>
              <div className="text-xs text-muted-foreground">{t('evaluation.result.summary.totalScore')}</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{run.totalCases}</div>
              <div className="text-xs text-muted-foreground">{t('evaluation.result.summary.totalCases')}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{run.passedCases}</div>
              <div className="text-xs text-muted-foreground">{t('evaluation.result.summary.passed')}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{run.failedCases}</div>
              <div className="text-xs text-muted-foreground">{t('evaluation.result.summary.failed')}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dimension scores */}
      <Card>
        <CardHeader>
          <CardTitle>{t('evaluation.result.dimensions.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(dimensionScoresAgg).map(([dim, score]) => (
              <div key={dim} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{DIMENSION_LABELS[dim] ?? dim}</span>
                  <span className="font-mono">{score.toFixed(3)}</span>
                </div>
                <Progress value={score * 100} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Case results */}
      <Card>
        <CardHeader>
          <CardTitle>{t('evaluation.result.cases.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>{t('evaluation.result.cases.caseId')}</TableHead>
                <TableHead>{t('evaluation.result.cases.category')}</TableHead>
                <TableHead>{t('evaluation.result.cases.status')}</TableHead>
                <TableHead className="text-right">{t('evaluation.result.cases.score')}</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.map((c) => (
                <React.Fragment key={c.caseId}>
                  <TableRow id={`case-row-${c.caseId}`} className="cursor-pointer" onClick={() => toggleCase(c.caseId)}>
                    <TableCell>
                      <IconChevronRight
                        className={`h-4 w-4 transition-transform ${expandedCases.has(c.caseId) ? 'rotate-90' : ''}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{c.caseId}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.category}</Badge>
                    </TableCell>
                    <TableCell>
                      {c.passed ? (
                        <Badge variant="default">{t('evaluation.result.cases.passed')}</Badge>
                      ) : (
                        <Badge variant="destructive">{t('evaluation.result.cases.failed')}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">{c.score.toFixed(3)}</TableCell>
                    <TableCell>
                      <TraceButton runRecord={c.runRecord} />
                    </TableCell>
                  </TableRow>
                  {expandedCases.has(c.caseId) && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/30 p-4">
                        <CaseDetail caseResult={c} dimensionLabels={DIMENSION_LABELS} />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconBulb className="h-5 w-5" />
            {t('evaluation.result.suggestions.title')}
          </CardTitle>
          <CardDescription>{t('evaluation.result.suggestions.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t('evaluation.result.suggestions.noSuggestions')}
            </p>
          ) : (
            <div className="space-y-3">
              {suggestions.map((s) => (
                <SuggestionCard
                  key={s.id}
                  suggestion={s}
                  dimensionLabels={DIMENSION_LABELS}
                  onCaseClick={(caseId) => {
                    setExpandedCases((prev) => new Set(prev).add(caseId));
                    setTimeout(() => {
                      document.getElementById(`case-row-${caseId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 50);
                  }}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const PRIORITY_STYLES: Record<SuggestionPriority, { border: string; badge: 'destructive' | 'default' | 'secondary' }> = {
  high: { border: 'border-l-red-500', badge: 'destructive' },
  medium: { border: 'border-l-yellow-500', badge: 'default' },
  low: { border: 'border-l-blue-500', badge: 'secondary' },
};

function SuggestionCard({ suggestion: s, dimensionLabels, onCaseClick }: { suggestion: StructuredSuggestion; dimensionLabels: Record<string, string>; onCaseClick: (caseId: string) => void }) {
  const { t } = useTranslation('setting');
  const style = PRIORITY_STYLES[s.priority];
  const [showCases, setShowCases] = React.useState(false);

  return (
    <div className={`rounded-lg border border-l-4 ${style.border} p-4 space-y-2`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Badge variant={style.badge} className="shrink-0 text-[10px]">
            {t(`evaluation.result.suggestions.priority.${s.priority}`)}
          </Badge>
          <span className="font-medium text-sm truncate">{s.title}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <Badge variant="outline" className="text-[10px]">
            {dimensionLabels[s.dimension] ?? s.dimension}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {t(`evaluation.result.suggestions.category.${s.category}`)}
          </Badge>
        </div>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>{t(`evaluation.result.suggestions.effort.${s.effort}`)}</span>
        <span>·</span>
        <button
          className="underline underline-offset-2 hover:text-foreground transition-colors"
          onClick={() => setShowCases(!showCases)}
        >
          {t('evaluation.result.suggestions.affectedCases', { count: s.affectedCases.length })}
        </button>
      </div>
      {showCases && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {s.affectedCases.map((caseId) => (
            <button
              key={caseId}
              className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-muted hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
              onClick={() => onCaseClick(caseId)}
            >
              {caseId}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TraceButton({ runRecord }: { runRecord: string }) {
  const { t } = useTranslation('setting');
  const router = useRouter();
  const traceId = parseTraceId(runRecord);
  if (!traceId) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 w-6 p-0"
      title={t('evaluation.result.cases.viewTrace')}
      onClick={(e) => {
        e.stopPropagation();
        router.push(`/setting/observability?search=${encodeURIComponent(traceId)}`);
      }}
    >
      <IconExternalLink className="h-3.5 w-3.5" />
    </Button>
  );
}

function CaseDetail({ caseResult, dimensionLabels }: { caseResult: CaseResult; dimensionLabels: Record<string, string> }) {
  const { t } = useTranslation('setting');
  const dimensions = parseDimensionScores(caseResult.dimensionScores);

  return (
    <div className="space-y-3">
      {/* Dimension scores for this case */}
      <div>
        <h4 className="text-sm font-medium mb-2">{t('evaluation.result.cases.dimensionScores')}</h4>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {Object.entries(dimensions).map(([dim, score]) => (
          <div key={dim} className="text-center">
            <div className="text-xs text-muted-foreground">{dimensionLabels[dim] ?? dim}</div>
            <div className={`font-mono text-sm ${score < 0.7 ? 'text-red-600' : ''}`}>
              {score.toFixed(3)}
            </div>
          </div>
        ))}
      </div>

      {/* Scorer details */}
      {caseResult.scorers.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">{t('evaluation.result.cases.scorerDetails')}</h4>
          <div className="space-y-1">
            {caseResult.scorers.map((scorer) => (
              <div
                key={scorer.id}
                className="flex items-center justify-between text-xs rounded px-2 py-1 hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  {!scorer.passed && <IconAlertTriangle className="h-3 w-3 text-amber-500" />}
                  <span className="font-mono">{scorer.name}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {scorer.dimension}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground max-w-xs truncate">{scorer.reason}</span>
                  <span className={`font-mono ${scorer.score < 0.7 ? 'text-red-600' : ''}`}>
                    {scorer.score.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function parseTraceId(runRecord: string): string | null {
  try {
    const record = JSON.parse(runRecord);
    return record?.trace?.traceId ?? record?.caseId ?? null;
  } catch {
    return null;
  }
}

function parseDimensionScores(raw: string): Record<string, number> {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function computeDimensionAverages(cases: CaseResult[]): Record<string, number> {
  const sums: Record<string, number[]> = {};
  for (const c of cases) {
    const dims = parseDimensionScores(c.dimensionScores);
    for (const [dim, score] of Object.entries(dims)) {
      (sums[dim] ??= []).push(score);
    }
  }
  const result: Record<string, number> = {};
  for (const [dim, scores] of Object.entries(sums)) {
    result[dim] = scores.reduce((a, b) => a + b, 0) / scores.length;
  }
  return result;
}

type SuggestionPriority = 'high' | 'medium' | 'low';
type SuggestionEffort = 'small' | 'medium' | 'large';
type SuggestionCategory = 'system-prompt' | 'tool-config' | 'timeout' | 'knowledge' | 'architecture';

interface StructuredSuggestion {
  id: string;
  dimension: string;
  category: SuggestionCategory;
  title: string;
  description: string;
  priority: SuggestionPriority;
  effort: SuggestionEffort;
  affectedCases: string[];
}

interface SuggestionTemplate {
  category: SuggestionCategory;
  title: string;
  description: string;
  priority: SuggestionPriority;
  effort: SuggestionEffort;
}

const DIMENSION_SUGGESTIONS: Record<string, SuggestionTemplate> = {
  mission: {
    category: 'timeout',
    title: '增加评测超时时间并检查 API 连通性',
    description: '大量用例因超时或连接失败导致任务未完成。建议增加 timeoutMs（推荐 180s），并确认 Agent API 端点可达且响应稳定。',
    effort: 'small',
    priority: 'high',
  },
  action: {
    category: 'system-prompt',
    title: '在 System Prompt 中强化工具调用引导',
    description: 'Agent 倾向于直接回答问题而非调用工具获取实时数据。建议在 system prompt 中加入明确指令：当用户询问具体股票、持仓、市场数据时，必须先调用对应工具获取最新数据。',
    effort: 'medium',
    priority: 'high',
  },
  context: {
    category: 'architecture',
    title: '确保多轮对话传递完整历史上下文',
    description: '多轮对话中 Agent 未能引用前几轮提到的实体（股票代码、金额、用户偏好）。检查是否完整传递了历史消息，以及 context window 是否足够容纳多轮会话。',
    effort: 'medium',
    priority: 'medium',
  },
  execution: {
    category: 'knowledge',
    title: '扩展 Agent 知识库和分析能力覆盖度',
    description: 'Agent 输出未覆盖预期的关键词和分析维度。建议扩展 Agent 知识库或 skill 配置，确保其能覆盖估值指标、行业分析、技术指标等分析维度。',
    effort: 'large',
    priority: 'medium',
  },
  ethics: {
    category: 'system-prompt',
    title: '在 System Prompt 中追加风险免责模板',
    description: 'Agent 的投资分析回复缺少风险警告和免责声明。建议在 system prompt 末尾添加强制风险提示模板，要求每次涉及投资建议时必须附加风险披露。',
    effort: 'small',
    priority: 'high',
  },
};

const SCORER_PATTERNS: Array<{ match: (r: string) => boolean; template: SuggestionTemplate; }> = [
  {
    match: (r) => /Missing:.*disclaimer/i.test(r),
    template: { category: 'system-prompt', title: '添加固定风险提示后缀', description: '在 system prompt 中要求 Agent 对所有投资相关回答附加标准免责声明，如"以上分析仅供参考，不构成投资建议"。', effort: 'small', priority: 'high' },
  },
  {
    match: (r) => /Missing:.*specific-risk/i.test(r),
    template: { category: 'system-prompt', title: '要求 Agent 输出具体风险因素', description: '要求 Agent 在分析特定股票时指出该标的的具体风险因素（如集中度风险、行业周期风险、估值过高风险等）。', effort: 'small', priority: 'medium' },
  },
  {
    match: (r) => /Matched 0\/\d+ expected tools/i.test(r),
    template: { category: 'tool-config', title: '检查工具注册和调用引导配置', description: 'Agent 完全没有调用预期的工具。检查工具是否正确注册，以及 system prompt 是否有明确的工具使用引导。', effort: 'medium', priority: 'high' },
  },
  {
    match: (r) => /Referenced 0\/\d+ entities/i.test(r),
    template: { category: 'architecture', title: '修复多轮对话上下文丢失', description: '在多轮对话中 Agent 完全未引用前几轮出现的实体。确认历史消息已完整传递，并检查 prompt 中是否有指令要求 Agent 关联前文。', effort: 'medium', priority: 'medium' },
  },
  {
    match: (r) => /Contradictory signals/i.test(r),
    template: { category: 'system-prompt', title: '引导 Agent 结构化分析避免矛盾输出', description: 'Agent 在同一段落中输出了矛盾信号。建议在 system prompt 中要求分析时先列出看多/看空因素，然后给出综合判断，避免前后矛盾。', effort: 'small', priority: 'medium' },
  },
  {
    match: (r) => /Run failed|response was too short/i.test(r),
    template: { category: 'timeout', title: '排查 Agent 运行失败根因', description: 'Agent 执行失败或返回内容过短。可能是超时、API 错误或模型生成异常。检查日志确认具体失败原因。', effort: 'small', priority: 'high' },
  },
  {
    match: (r) => /Missing:.*actionability/i.test(r),
    template: { category: 'system-prompt', title: '提升回答的可操作性', description: 'Agent 回答缺乏可操作性。建议在 system prompt 中要求给出具体、可执行的建议（如具体的买入价位、仓位比例、时间框架）而非笼统描述。', effort: 'small', priority: 'medium' },
  },
];

function generateSuggestions(cases: CaseResult[], threshold: number): StructuredSuggestion[] {
  const suggestions: StructuredSuggestion[] = [];
  const failedCases = cases.filter((c) => !c.passed);
  let idx = 0;

  const dimensionAverages = computeDimensionAverages(cases);
  for (const [dimension, score] of Object.entries(dimensionAverages)) {
    if (score < threshold) {
      const template = DIMENSION_SUGGESTIONS[dimension];
      if (!template) continue;
      const affected = failedCases
        .filter((c) => {
          const dims = parseDimensionScores(c.dimensionScores);
          return dims[dimension] !== undefined && dims[dimension] < threshold;
        })
        .map((c) => c.caseId);
      if (affected.length > 0) {
        suggestions.push({ ...template, dimension, affectedCases: affected, id: `dim-${idx++}` });
      }
    }
  }

  const seenPatterns = new Set<number>();
  for (const c of failedCases) {
    for (const scorer of c.scorers) {
      if (scorer.passed) continue;
      for (let pi = 0; pi < SCORER_PATTERNS.length; pi++) {
        const pattern = SCORER_PATTERNS[pi];
        if (!seenPatterns.has(pi) && pattern.match(scorer.reason)) {
          const affected = failedCases
            .filter((fc) => fc.scorers.some((s) => !s.passed && pattern.match(s.reason)))
            .map((fc) => fc.caseId);
          suggestions.push({ ...pattern.template, dimension: scorer.dimension, affectedCases: affected, id: `scorer-${idx++}` });
          seenPatterns.add(pi);
        }
      }
    }
  }

  const priorityOrder: Record<SuggestionPriority, number> = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return suggestions;
}
