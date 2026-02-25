'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Package, Heart, Code, Zap, Shield, Info } from 'lucide-react';
import { Separator } from '@renderer/components/ui/separator';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';

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

  useEffect(() => {
    fetchAboutInfo()
      .then(setAboutInfo)
      .catch(() => {
        // 使用默认值
      })
      .finally(() => setLoading(false));
  }, []);

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