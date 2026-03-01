'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Package, Heart, Code, Zap, Shield, Info, Download, CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Separator } from '@renderer/components/ui/separator';
import { Button } from '@renderer/components/ui/button';
import { Progress } from '@renderer/components/ui/progress';
import { Alert, AlertDescription } from '@renderer/components/ui/alert';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useAutoUpdate } from '@/app/hooks/useAutoUpdate';
import { Modal } from 'antd';

interface AboutInfo {
  version: string;
  buildDate: string;
  license: string;
  developer: string;
}

async function fetchAboutInfo(): Promise<AboutInfo> {
  const response = await fetch('/api/about');
  if (!response.ok) {
    throw new Error('Failed to fetch about info');
  }
  return response.json();
}

export default function AboutPage() {
  const { t } = useTranslation('setting');
  const [aboutInfo, setAboutInfo] = useState<AboutInfo>({
    version: '0.0.0',
    buildDate: '-',
    license: '-',
    developer: '-',
  });
  const [loading, setLoading] = useState(true);
  
  // 集成自动更新功能
  const {
    status: updateStatus,
    updateInfo,
    downloadProgress,
    error: updateError,
    isElectron,
    checkForUpdates,
    installUpdate,
  } = useAutoUpdate();

  useEffect(() => {
    fetchAboutInfo()
      .then(setAboutInfo)
      .catch(() => {
        // 使用默认值
      })
      .finally(() => setLoading(false));
  }, []);
  
  // 处理检查更新按钮点击
  const handleCheckUpdate = async () => {
    await checkForUpdates();
  };
  
  // 处理安装更新按钮点击
  const handleInstallUpdate = () => {
    Modal.confirm({
      title: t('about.update.confirmTitle', '确认更新'),
      content: t('about.update.confirmContent', '应用将重启以完成更新。您的数据已自动保存，无需担心数据丢失。确定要立即更新吗？'),
      okText: t('about.update.confirm', '立即更新'),
      cancelText: t('about.update.cancel', '取消'),
      onOk: () => {
        installUpdate();
      },
    });
  };
  
  // 获取更新状态的显示文本和图标
  const getUpdateStatusDisplay = () => {
    switch (updateStatus) {
      case 'checking':
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin text-blue-500" />,
          text: t('about.update.checking', '检查中...'),
          type: 'info' as const,
        };
      case 'available':
        return {
          icon: <Download className="h-4 w-4 text-orange-500" />,
          text: t('about.update.available', '有新版本可用'),
          type: 'warning' as const,
        };
      case 'downloading':
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin text-blue-500" />,
          text: t('about.update.downloading', '下载中...'),
          type: 'info' as const,
        };
      case 'up-to-date':
        return {
          icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
          text: t('about.update.upToDate', '已是最新版本'),
          type: 'success' as const,
        };
      case 'error':
        return {
          icon: <AlertCircle className="h-4 w-4 text-red-500" />,
          text: t('about.update.error', '更新失败'),
          type: 'error' as const,
        };
      default:
        return null;
    }
  };
  
  const statusDisplay = getUpdateStatusDisplay();

  return (
    <div className="flex-1 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('about.title', '关于')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('about.description', '了解当前应用的基本信息')}
          </p>
        </div>
      </div>

      {/* App Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-lg bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
              <Package className="h-8 w-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Investment Agent</CardTitle>
              <CardDescription>{t('about.appName', '智能投资助手')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t('about.appSubtitle', 'Investment Agent 是一款基于人工智能的投资管理助手，帮助用户进行资产管理、市场分析、投资决策等操作。通过强大的 AI 能力，为用户提供个性化的投资建议和市场洞察。')}
          </p>
          <Separator />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t('about.version', '版本:')}</span>
              <span className="font-medium">{loading ? '-' : aboutInfo.version}</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t('about.buildDate', '构建:')}</span>
              <span className="font-medium">{loading ? '-' : aboutInfo.buildDate}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t('about.license', '许可证:')}</span>
              <span className="font-medium">{loading ? '-' : aboutInfo.license}</span>
            </div>
            <div className="flex items-center gap-2">
              <Code className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t('about.developer', '开发团队:')}</span>
              <span className="font-medium">{loading ? '-' : aboutInfo.developer}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 自动更新部分 - 仅在 Electron 环境中显示 */}
      {isElectron && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <RefreshCw className="h-4 w-4 text-primary" />
                  {t('about.update.title', '软件更新')}
                </CardTitle>
                <CardDescription className="mt-1">
                  {t('about.update.description', '检查并安装最新版本')}
                </CardDescription>
              </div>
              <Button
                onClick={handleCheckUpdate}
                disabled={updateStatus === 'checking' || updateStatus === 'downloading'}
                variant="outline"
                size="sm"
              >
                {updateStatus === 'checking' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('about.update.checking', '检查中')}
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t('about.update.checkButton', '检查更新')}
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 当前版本信息 */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="space-y-1">
                <p className="text-sm font-medium">{t('about.update.currentVersion', '当前版本')}</p>
                <p className="text-xs text-muted-foreground">{aboutInfo.version}</p>
              </div>
              {updateInfo && (
                <div className="space-y-1 text-right">
                  <p className="text-sm font-medium">{t('about.update.latestVersion', '最新版本')}</p>
                  <p className="text-xs text-primary font-semibold">{updateInfo.version}</p>
                </div>
              )}
            </div>

            {/* 更新状态显示 */}
            {statusDisplay && (
              <Alert>
                <div className="flex items-center gap-2">
                  {statusDisplay.icon}
                  <AlertDescription>{statusDisplay.text}</AlertDescription>
                </div>
              </Alert>
            )}

            {/* 下载进度条 */}
            {updateStatus === 'downloading' && downloadProgress && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('about.update.progress', '下载进度')}</span>
                  <span className="font-medium">{downloadProgress.percent.toFixed(1)}%</span>
                </div>
                <Progress value={downloadProgress.percent} className="h-2" />
                <p className="text-xs text-muted-foreground text-right">
                  {(downloadProgress.transferred / 1024 / 1024).toFixed(2)} MB / {(downloadProgress.total / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}

            {/* 错误信息 */}
            {updateError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{updateError.message}</AlertDescription>
              </Alert>
            )}

            {/* 更新详情 */}
            {updateInfo && updateStatus === 'available' && (
              <div className="space-y-3">
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t('about.update.releaseNotes', '更新内容')}</p>
                  <div className="text-xs text-muted-foreground whitespace-pre-wrap p-3 bg-muted/50 rounded-lg max-h-32 overflow-y-auto">
                    {updateInfo.releaseNotes || t('about.update.noReleaseNotes', '暂无更新说明')}
                  </div>
                </div>
                <Button
                  onClick={handleInstallUpdate}
                  className="w-full"
                  size="sm"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {t('about.update.downloadAndInstall', '下载并安装')}
                </Button>
              </div>
            )}

            {/* 数据安全提示 */}
            <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
              <p className="flex items-start gap-2">
                <Shield className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>{t('about.update.dataSafety', '您的所有数据（数据库、配置等）都存储在独立的用户数据目录中，更新不会影响这些数据。')}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Features */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-primary" />
              {t('about.coreFeatures', '核心功能')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-1">
              <p className="font-medium">{t('about.features.assetManagement.title', '资产管理')}</p>
              <p className="text-muted-foreground text-xs">{t('about.features.assetManagement.description', '全面的账户管理和持仓跟踪')}</p>
            </div>
            <Separator />
            <div className="text-sm space-y-1">
              <p className="font-medium">{t('about.features.aiInsights.title', 'AI 洞察')}</p>
              <p className="text-muted-foreground text-xs">{t('about.features.aiInsights.description', '基于 AI 的市场分析和投资建议')}</p>
            </div>
            <Separator />
            <div className="text-sm space-y-1">
              <p className="font-medium">{t('about.features.smartInteraction.title', '智能交互')}</p>
              <p className="text-muted-foreground text-xs">{t('about.features.smartInteraction.description', '与 AI 助手进行自然语言对话')}</p>
            </div>
            <Separator />
            <div className="text-sm space-y-1">
              <p className="font-medium">{t('about.features.researchReports.title', '研究报告')}</p>
              <p className="text-muted-foreground text-xs">{t('about.features.researchReports.description', '深度分析和智能报告生成')}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-primary" />
              {t('about.techFeatures', '技术特性')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-1">
              <p className="font-medium">{t('about.features.agentManagement.title', '智能体管理')}</p>
              <p className="text-muted-foreground text-xs">{t('about.features.agentManagement.description', '灵活配置和管理 AI 智能体')}</p>
            </div>
            <Separator />
            <div className="text-sm space-y-1">
              <p className="font-medium">{t('about.features.modelIntegration.title', '模型集成')}</p>
              <p className="text-muted-foreground text-xs">{t('about.features.modelIntegration.description', '支持多种模型服务商')}</p>
            </div>
            <Separator />
            <div className="text-sm space-y-1">
              <p className="font-medium">{t('about.features.dataVisualization.title', '数据可视化')}</p>
              <p className="text-muted-foreground text-xs">{t('about.features.dataVisualization.description', '直观的数据展示和分析')}</p>
            </div>
            <Separator />
            <div className="text-sm space-y-1">
              <p className="font-medium">{t('about.features.themeSwitching.title', '主题切换')}</p>
              <p className="text-muted-foreground text-xs">{t('about.features.themeSwitching.description', '支持浅色/深色主题')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Heart className="h-4 w-4 text-red-500" />
            {t('about.thanks', '致谢')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t('about.thanksText', '感谢所有为本项目做出贡献的开发者和用户。我们将继续努力，提供更好的产品和服务。')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}