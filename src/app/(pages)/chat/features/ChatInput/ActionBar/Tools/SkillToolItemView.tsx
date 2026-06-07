import { ActionIcon } from '@lobehub/ui';
import { Checkbox, Tooltip } from 'antd';
import { Sparkles } from 'lucide-react';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

interface SkillToolItemViewProps {
  checked: boolean;
  description?: string;
  id: string;
  isExplicit: boolean;
  label: string;
  onPin: () => void;
  onToggle: () => void;
}

const SkillToolItemView = memo<SkillToolItemViewProps>(
  ({ id, label, description, checked, isExplicit, onToggle, onPin }) => {
    return (
      <Flexbox
        align={'center'}
        gap={8}
        horizontal
        justify={'space-between'}
        style={{ paddingLeft: 8 }}
      >
        <Tooltip title={description}>
          <Flexbox align={'center'} gap={8} horizontal style={{ flex: 1, minWidth: 0 }}>
            {label || id}
          </Flexbox>
        </Tooltip>
        <Flexbox align={'center'} gap={4} horizontal>
          <Tooltip title={isExplicit ? '取消指定' : '指定下一条消息使用'}>
            <ActionIcon
              icon={Sparkles}
              onClick={(e) => {
                e.stopPropagation();
                onPin();
              }}
              size={'small'}
              style={{
                color: isExplicit ? 'var(--ant-color-primary)' : undefined,
                opacity: isExplicit ? 1 : 0.4,
              }}
            />
          </Tooltip>
          <Checkbox
            checked={checked}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          />
        </Flexbox>
      </Flexbox>
    );
  },
);

export default SkillToolItemView;
