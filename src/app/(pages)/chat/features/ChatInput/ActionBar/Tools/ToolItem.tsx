import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import CheckboxItem, { CheckboxItemProps } from '../components/CheckbokWithLoading';

const ToolItem = memo<CheckboxItemProps>(({ id, onUpdate, label, checked }) => {

  return (
    <CheckboxItem
      checked={checked}
      id={id}
      label={
        <Flexbox align={'center'} gap={8} horizontal>
          {label || id}
        </Flexbox>
      }
      onUpdate={onUpdate}
    />
  );
});

export default ToolItem;
