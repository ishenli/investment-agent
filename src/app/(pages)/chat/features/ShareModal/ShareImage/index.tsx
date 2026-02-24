import { Button, Form, type FormItemProps, Segmented } from '@lobehub/ui';
import { Switch } from 'antd';
import { CopyIcon } from 'lucide-react';
import { memo, useState } from 'react';
import { Flexbox } from 'react-layout-kit';

import { FORM_STYLE } from '@renderer/const/layoutTokens';
import { useImgToClipboard } from '@renderer/hooks/useImgToClipboard';
import { ImageType, imageTypeOptions, useScreenshot } from '@renderer/hooks/useScreenshot';
import { useSessionStore } from '@renderer/store/session';
import { sessionMetaSelectors } from '@renderer/store/session/selectors';

import React from 'react';
import { useStyles } from '../style';
import Preview from './Preview';
import { FieldType } from './type';
import { useTranslation } from 'react-i18next';

const DEFAULT_FIELD_VALUE: FieldType = {
  imageType: ImageType.JPG,
  withBackground: true,
  withFooter: true,
  withPluginInfo: false,
  withSystemRole: false,
};

const ShareImage = memo<{ mobile?: boolean }>(() => {
  const currentAgentTitle = useSessionStore(sessionMetaSelectors.currentAgentTitle);
  const { t } = useTranslation(['chat', 'common']);
  const [fieldValue, setFieldValue] = useState<FieldType>(DEFAULT_FIELD_VALUE);
  const { styles } = useStyles();
  const { loading, onDownload, title } = useScreenshot({
    imageType: fieldValue.imageType,
    title: currentAgentTitle,
  });
  const { loading: copyLoading, onCopy } = useImgToClipboard();
  const settings: FormItemProps[] = [
    // {
    //   children: <Switch />,
    //   label:'包含助手角色设定',
    //   layout: 'horizontal',
    //   minWidth: undefined,
    //   name: 'withSystemRole',
    //   valuePropName: 'checked',
    // },
    {
      children: <Switch />,
      label: t('withBackground'),
      layout: 'horizontal',
      minWidth: undefined,
      name: 'withBackground',
      valuePropName: 'checked',
    },
    {
      children: <Switch />,
      label: t('withFooter'),
      layout: 'horizontal',
      minWidth: undefined,
      name: 'withFooter',
      valuePropName: 'checked',
    },
    {
      children: <Segmented options={imageTypeOptions} />,
      label: t('imageFormat'),
      layout: 'horizontal',
      minWidth: undefined,
      name: 'imageType',
    },
  ];

  const isMobile = false;

  const button = (
    <>
      <Button
        block
        icon={CopyIcon}
        loading={copyLoading}
        onClick={() => onCopy()}
        size={isMobile ? undefined : 'large'}
        type={'primary'}
      >
        {t('copy')}
      </Button>
      <Button block loading={loading} onClick={onDownload} size={isMobile ? undefined : 'large'}>
        {t('common:download')}
      </Button>
    </>
  );

  return (
    <>
      <Flexbox className={styles.body} gap={16} horizontal={!isMobile}>
        <Preview title={title} {...fieldValue} />
        <Flexbox className={styles.sidebar} gap={12}>
          <Form
            initialValues={DEFAULT_FIELD_VALUE}
            items={settings}
            itemsType={'flat'}
            onValuesChange={(_, v) => setFieldValue(v)}
            {...FORM_STYLE}
          />
          {!isMobile && button}
        </Flexbox>
      </Flexbox>
      {isMobile && (
        <Flexbox className={styles.footer} gap={8} horizontal>
          {button}
        </Flexbox>
      )}
    </>
  );
});

export default ShareImage;
