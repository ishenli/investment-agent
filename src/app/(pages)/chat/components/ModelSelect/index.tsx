import { IconAvatarProps, ModelIcon, ProviderIcon } from '@lobehub/icons';
import { Avatar, Icon, Tag, Text, Tooltip } from '@lobehub/ui';
import { createStyles, useResponsive } from 'antd-style';
import { AtomIcon, Infinity, ToyBrick } from 'lucide-react';
import numeral from 'numeral';
import { FC, memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import { ModelAbilities } from '@typings/aiModel';
import { ChatModelCard } from '@typings/llm';
import { formatTokenNumber } from '@renderer/lib/utils/format';
import React from 'react';

export const TAG_CLASSNAME = 'lobe-model-info-tags';

const useStyles = createStyles(({ css, token }) => ({
  tag: css`
    cursor: default;

    display: flex;
    align-items: center;
    justify-content: center;

    width: 20px !important;
    height: 20px;
    border-radius: 4px;
  `,
  token: css`
    width: 36px !important;
    height: 20px;
    border-radius: 4px;

    font-family: ${token.fontFamilyCode};
    font-size: 11px;
    color: ${token.colorTextSecondary};

    background: ${token.colorFillTertiary};
  `,
}));

interface ModelInfoTagsProps extends ModelAbilities {
  contextWindowTokens?: number | null;
  directionReverse?: boolean;
  isCustom?: boolean;
  placement?: 'top' | 'right';
}

export const ModelInfoTags = memo<ModelInfoTagsProps>(
  ({ directionReverse, placement = 'right', ...model }) => {
    const { styles } = useStyles();
    return (
      <Flexbox
        className={TAG_CLASSNAME}
        direction={directionReverse ? 'horizontal-reverse' : 'horizontal'}
        gap={4}
        width={'fit-content'}
      >
        {model.functionCall && (
          <Tooltip
            placement={placement}
            styles={{
              root: { maxWidth: 'unset', pointerEvents: 'none' },
            }}
            title="该模型支持函数调用（Function Call）"
          >
            <Tag className={styles.tag} color={'info'} size={'small'}>
              <Icon icon={ToyBrick} />
            </Tag>
          </Tooltip>
        )}
        {model.reasoning && (
          <Tooltip
            placement={placement}
            styles={{ root: { pointerEvents: 'none' } }}
            title="该模型支持深度思考"
          >
            <Tag className={styles.tag} color={'purple'} size={'small'}>
              <Icon icon={AtomIcon} />
            </Tag>
          </Tooltip>
        )}
        {typeof model.contextWindowTokens === 'number' && (
          <Tooltip
            placement={placement}
            styles={{
              root: { maxWidth: 'unset', pointerEvents: 'none' },
            }}
            title={`该模型单个会话最多支持${
              model.contextWindowTokens === 0
                ? '∞'
                : numeral(model.contextWindowTokens).format('0,0')
            } Tokens`}
          >
            <Tag className={styles.token} size={'small'}>
              {model.contextWindowTokens === 0 ? (
                <Infinity size={17} strokeWidth={1.6} />
              ) : (
                formatTokenNumber(model.contextWindowTokens as number)
              )}
            </Tag>
          </Tooltip>
        )}
      </Flexbox>
    );
  },
);

interface ModelItemRenderProps extends ChatModelCard {
  showInfoTag?: boolean;
}

export const ModelItemRender = memo<ModelItemRenderProps>(({ showInfoTag = true, ...model }) => {
  const { mobile } = useResponsive();
  return (
    <Flexbox
      align={'center'}
      gap={32}
      horizontal
      justify={'space-between'}
      style={{
        minWidth: mobile ? '100%' : undefined,
        overflow: 'hidden',
        position: 'relative',
        width: mobile ? '80vw' : 'auto',
      }}
    >
      <Flexbox
        align={'center'}
        gap={8}
        horizontal
        style={{ flexShrink: 1, minWidth: 0, overflow: 'hidden' }}
      >
        <ModelIcon model={model.id as string} size={20} />
        <Text style={mobile ? { maxWidth: '60vw', overflowX: 'auto', whiteSpace: 'nowrap' } : {}}>
          {model.displayName || (model.id as string)}
        </Text>
      </Flexbox>
      {showInfoTag && <ModelInfoTags {...model} />}
    </Flexbox>
  );
});

interface ProviderItemRenderProps {
  logo?: string;
  name: string;
  provider: string;
  source?: string;
}

export const ProviderItemRender = memo<ProviderItemRenderProps>(
  ({ provider, name, logo, source }) => {
    return (
      <Flexbox align={'center'} gap={4} horizontal>
        {source === 'custom' && !!logo ? (
          <Avatar avatar={logo} size={20} style={{ filter: 'grayscale(1)' }} title={name} />
        ) : (
          <ProviderIcon provider={provider} size={20} type={'mono'} />
        )}
        {name}
      </Flexbox>
    );
  },
);

interface LabelRendererProps {
  Icon: FC<IconAvatarProps>;
  label: string;
}

export const LabelRenderer = memo<LabelRendererProps>(({ Icon, label }) => (
  <Flexbox align={'center'} gap={8} horizontal>
    <Icon size={20} />
    <span>{label}</span>
  </Flexbox>
));
