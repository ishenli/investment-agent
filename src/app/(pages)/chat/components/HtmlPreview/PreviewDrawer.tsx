import { Block, Button, Highlighter, Segmented } from '@lobehub/ui';
import { Drawer } from 'antd';
import { createStyles } from 'antd-style';
import { Code2, Download, Eye } from 'lucide-react';
import React, { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

const useStyles = createStyles(({ css }) => ({
  container: css`
    height: 100%;
  `,
  iframe: css`
    width: 100%;
    height: 100%;
    border: none;
  `,
}));

interface HtmlPreviewDrawerProps {
  content: string;
  onClose: () => void;
  open: boolean;
}

const HtmlPreviewDrawer = memo<HtmlPreviewDrawerProps>(({ content, open, onClose }) => {
  const { styles } = useStyles();
  const { t } = useTranslation('components');
  const [mode, setMode] = useState<'preview' | 'code'>('preview');

  const htmlContent = content;

  const extractTitle = useCallback(() => {
    const m = htmlContent.match(/<title>([\S\s]*?)<\/title>/i);
    return m ? m[1].trim() : undefined;
  }, [htmlContent]);

  const sanitizeFileName = useCallback((name: string) => {
    return name
      .replaceAll(/["*/:<>?\\|]/g, '-')
      .replaceAll(/\s+/g, ' ')
      .trim()
      .slice(0, 100);
  }, []);

  const onDownload = useCallback(() => {
    const title = extractTitle();
    const base = title ? sanitizeFileName(title) : `chat-html-preview-${Date.now()}`;
    // exportFile(content, `${base}.html`);
    console.log(content, `${base}.html`);
  }, [content, extractTitle, sanitizeFileName]);

  const Title = (
    <Flexbox align={'center'} horizontal justify={'space-between'} style={{ width: '100%' }}>
      HTML 预览
      <Segmented
        onChange={(v) => setMode(v as 'preview' | 'code')}
        options={[
          {
            label: (
              <Flexbox align={'center'} gap={6} horizontal>
                <Eye size={16} />
                预览
              </Flexbox>
            ),
            value: 'preview',
          },
          {
            label: (
              <Flexbox align={'center'} gap={6} horizontal>
                <Code2 size={16} />
                代码
              </Flexbox>
            ),
            value: 'code',
          },
        ]}
        value={mode}
      />
      <Button
        color={'default'}
        icon={<Download size={16} />}
        onClick={onDownload}
        variant={'filled'}
      >
        下载
      </Button>
    </Flexbox>
  );

  return (
    <Drawer
      destroyOnHidden
      height={'100vh'}
      onClose={onClose}
      open={open}
      placement="bottom"
      styles={{
        body: { height: '100%', padding: 0 },
        header: { paddingBlock: 8, paddingInline: 12 },
      }}
      title={Title}
    >
      {mode === 'preview' ? (
        <Block className={styles.container}>
          <iframe
            className={styles.iframe}
            sandbox="allow-scripts allow-same-origin"
            srcDoc={content}
            title="HTML 预览"
          />
        </Block>
      ) : (
        <Block className={styles.container}>
          <Highlighter
            language={'html'}
            showLanguage={false}
            style={{ height: '100%', overflow: 'auto' }}
          >
            {htmlContent}
          </Highlighter>
        </Block>
      )}
    </Drawer>
  );
});

HtmlPreviewDrawer.displayName = 'HtmlPreviewDrawer';

export default HtmlPreviewDrawer;
