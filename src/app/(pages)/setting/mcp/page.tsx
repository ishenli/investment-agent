'use client';

import { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Link2,
  Loader2,
  ServerOff,
  ShieldAlert,
  Wrench,
  XCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription } from '@renderer/components/ui/alert';
import { Badge } from '@renderer/components/ui/badge';
import { Button } from '@renderer/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@renderer/components/ui/card';
import { Separator } from '@renderer/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@renderer/components/ui/table';

interface McpToolInfo {
  name: string;
  description: string;
  inputSchema?: { [key: string]: unknown };
}

interface McpInfo {
  endpoint: { url: string; port: number };
  tools: McpToolInfo[];
  configFiles: { app: string; file: string }[];
}

/** i18n 类型化 t 的 key 联合（对应 locales setting.json 中 mcp.tools.type 各键） */
type ToolLabelKey = 'mcp.tools.typeReadonly' | 'mcp.tools.typeWrite' | 'mcp.tools.typeGuard';

interface ToolKind {
  labelKey: ToolLabelKey;
  variant: 'destructive' | 'secondary' | 'outline';
}

const TOOL_KINDS: Record<string, ToolKind> = {
  marketInfoSaveTool: { labelKey: 'mcp.tools.typeWrite', variant: 'destructive' },
  dbQueryTool: { labelKey: 'mcp.tools.typeGuard', variant: 'outline' },
};

const DEFAULT_TOOL_KIND: ToolKind = { labelKey: 'mcp.tools.typeReadonly', variant: 'secondary' };

export default function McpSettingsPage() {
  const { t } = useTranslation('setting');
  const [info, setInfo] = useState<McpInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/mcp/info')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data) => {
        if (active) setInfo(data);
      })
      .catch(() => {
        if (active) setOffline(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const copyUrl = async () => {
    if (!info) return;
    try {
      await navigator.clipboard.writeText(info.endpoint.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // 剪贴板不可用时忽略
    }
  };

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div>
        <h1 className="text-2xl font-semibold">{t('mcp.title', 'MCP 连接')}</h1>
        <p className="text-sm text-muted-foreground mt-1 break-words leading-relaxed">{t('mcp.description', 'Investment Agent 内嵌的 Streamable-HTTP MCP endpoint，将应用能力以白名单工具形式暴露给外部 CodingAgent（Codex CLI / Claude Code / Cursor 等）。应用启动即自动提供，无需单独启动服务。')}</p>
      </div>

      {/* 连接信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            {t('mcp.endpoint.title', '连接信息')}
          </CardTitle>
          <CardDescription>{t('mcp.endpoint.description', '外部 CodingAgent 连接地址与运行状态')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('mcp.endpoint.loading', '正在获取 MCP 信息…')}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <code className="min-w-0 rounded bg-muted px-2 py-1 text-sm font-mono break-all whitespace-pre-wrap">
                  {info?.endpoint.url ?? '—'}
                </code>
                <Button size="sm" variant="outline" onClick={copyUrl} disabled={!info}>
                  {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? t('mcp.endpoint.copied', '已复制') : t('mcp.endpoint.copy', '复制')}
                </Button>
                <Badge variant="outline">
                  {t('mcp.endpoint.port', '端口 {{port}}', { port: info?.endpoint.port ?? '—' })}
                </Badge>
                {offline ? (
                  <Badge variant="destructive" className="gap-1">
                    <ServerOff className="h-3 w-3" />
                    {t('mcp.endpoint.status.offline', '未运行')}
                  </Badge>
                ) : (
                  <Badge className="gap-1 bg-green-600/90">
                    <CheckCircle2 className="h-3 w-3" />
                    {t('mcp.endpoint.status.online', '运行中')}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground break-words leading-relaxed">
                {t('mcp.endpoint.offlineHint', '应用未运行时连接会返回「连接被拒绝」，请先启动 IG 应用。8888 被其他进程占用时启动会失败，需释放端口或更换并同步各处 url。')}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* 白名单工具 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            {t('mcp.tools.title', '白名单工具')}
          </CardTitle>
          <CardDescription>
            {t('mcp.tools.description', 'tools/list 返回的全部工具（共 {{count}} 个）。默认只读；marketInfoSaveTool 为唯一显式启用的写操作（市场信息录入），dbQueryTool 带 SELECT-only 守卫。', { count: info?.tools.length ?? 0 })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-52">{t('mcp.tools.colName', '工具名')}</TableHead>
                <TableHead>{t('mcp.tools.colDescription', '说明')}</TableHead>
                <TableHead className="w-36">{t('mcp.tools.colType', '类型')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(info?.tools ?? []).map((tool) => {
                const kind = TOOL_KINDS[tool.name] ?? DEFAULT_TOOL_KIND;
                return (
                  <TableRow key={tool.name}>
                    <TableCell className="font-mono text-sm whitespace-normal break-all">{tool.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-normal break-words">{tool.description}</TableCell>
                    <TableCell>
                      <Badge variant={kind.variant}>{t(kind.labelKey)}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Separator />

      {/* CodingAgent 配置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            {t('mcp.config.title', 'CodingAgent 连接配置')}
          </CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-1 break-words">
            {t('mcp.config.description', '仓库已附带各 CodingAgent 的 url 模式连接配置，指向统一 endpoint：')}
            <code className="break-all rounded bg-muted px-1 font-mono text-xs">
              {info?.endpoint.url ?? 'http://127.0.0.1:8888/api/mcp'}
            </code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-64">{t('mcp.config.colAgent', 'CodingAgent')}</TableHead>
                <TableHead>{t('mcp.config.colFile', '配置文件')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(info?.configFiles ?? []).map((cfg) => (
                <TableRow key={cfg.file}>
                  <TableCell className="text-sm whitespace-normal break-words">{cfg.app}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground whitespace-normal break-all">{cfg.file}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-3">
            <Alert>
              <XCircle className="h-4 w-4" />
              <AlertDescription className="text-sm break-words leading-relaxed">
                {t('mcp.config.dbQueryGuard', 'dbQueryTool 强制只读：底层 queryDb 硬编码 SELECT + 表名/列名白名单 + 参数化查询，连接器层再加写语句特征守卫，任何非 SELECT 请求被拒绝。新增/移除白名单工具集中于 src/server/mcp/whitelist.ts。')}
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}