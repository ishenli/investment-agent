import { Blocks } from 'lucide-react';
import { Suspense, memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Action from '../components/Action';
import { useControls } from './useControls';

const Tools = memo(() => {
  const { t } = useTranslation('setting');
  const [updating, setUpdating] = useState(false);
  const items = useControls({ setUpdating });

  return (
    <Suspense fallback={<Action disabled icon={Blocks} title={t('tools.title')} />}>
      <Action
        dropdown={{
          maxHeight: 500,
          maxWidth: 480,
          menu: { items },
          minWidth: 320,
        }}
        icon={Blocks}
        loading={updating}
        showTooltip={false}
        title={t('tools.title')}
      />
    </Suspense>
  );
});

export default Tools;
