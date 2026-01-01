import { ActionIcon } from '@lobehub/ui';
import { Eye } from 'lucide-react';
import { memo, useState } from 'react';

import HtmlPreviewDrawer from './PreviewDrawer';

interface HtmlPreviewActionProps {
  content: string;
  size?: number;
}

const HtmlPreviewAction = memo<HtmlPreviewActionProps>(({ content, size }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ActionIcon
        icon={Eye}
        onClick={() => setOpen(true)}
        size={size}
        title="预览"
      />
      <HtmlPreviewDrawer content={content} onClose={() => setOpen(false)} open={open} />
    </>
  );
});

HtmlPreviewAction.displayName = 'HtmlPreviewAction';

export default HtmlPreviewAction;
