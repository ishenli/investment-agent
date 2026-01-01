import { Button } from '@lobehub/ui';
import { Plus } from 'lucide-react';
import React, { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import { useSessionStore } from '@renderer/store/session';

const AddButton = memo<{ groupId?: string }>(({ groupId }) => {
  const createSession = useSessionStore((s) => s.createSession);

  return (
    <Flexbox flex={1} padding={0}>
      <Button
        block
        icon={Plus}
        onClick={() => createSession({ group: groupId })}
        style={{
          marginTop: 8,
        }}
        variant={'filled'}
      >
        新建助手
      </Button>
    </Flexbox>
  );
});

export default AddButton;
