'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@renderer/components/ui/alert';
import { Button } from '@renderer/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@renderer/components/ui/dialog";
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import dayjs from 'dayjs';

type AssetCompanyInfoType = {
  id: number;
  assetMetaId: number;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

interface CompanyInfoViewProps {
  companyInfos: AssetCompanyInfoType[];
  onEdit?: (info: AssetCompanyInfoType) => void;
  onDelete?: (info: AssetCompanyInfoType) => void;
}

export function CompanyInfoView({ companyInfos, onEdit, onDelete }: CompanyInfoViewProps) {
  const [viewingInfo, setViewingInfo] = useState<AssetCompanyInfoType | null>(null);

  if (companyInfos.length === 0) {
    return (
      <Alert>
        <AlertTitle>暂无数据</AlertTitle>
        <AlertDescription>当前没有可用的公司信息。</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-6">
      {companyInfos.map((info) => (
        <Card key={info.id} className="hover:shadow-md transition-shadow relative group">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl">{info.title}</CardTitle>
                <CardDescription className="mt-2">
                  <span>
                    {dayjs(new Date(info.createdAt)).format('YYYY年MM月DD日 HH:mm')}
                  </span>
                </CardDescription>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewingInfo(info)}
                  title="查看详情"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(info)}
                    title="编辑"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(info)}
                    title="删除"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap h-40 overflow-hidden relative">
              {info.content}
              <span className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none" />
            </p>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!viewingInfo} onOpenChange={(open) => !open && setViewingInfo(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingInfo?.title}</DialogTitle>
            <DialogDescription>
              {viewingInfo && dayjs(new Date(viewingInfo.createdAt)).format('YYYY年MM月DD日 HH:mm')}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 whitespace-pre-wrap">
            {viewingInfo?.content}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}