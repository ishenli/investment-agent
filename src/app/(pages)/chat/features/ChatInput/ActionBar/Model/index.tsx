import { ModelIcon } from '@lobehub/icons';
import { createStyles } from 'antd-style';
import { memo } from 'react';
import { Center, Flexbox } from 'react-layout-kit';

import ModelSwitchPanel from '@renderer/(pages)/chat/features/ModelSwitchPanel';
import { useAgentStore } from '@renderer/store/agent';
import { agentSelectors } from '@renderer/store/agent/selectors';

import React from 'react';

const useStyles = createStyles(({ css, token, cx }) => ({
  container: css`
    border-radius: 20px;
    background: ${token.colorFillTertiary};
  `,
  icon: cx(
    'model-switch',
    css`
      transition: scale 400ms cubic-bezier(0.215, 0.61, 0.355, 1);
    `,
  ),
  model: css`
    cursor: pointer;
    border-radius: 8px;

    :hover {
      background: ${token.colorFillSecondary};
    }

    :active {
      .model-switch {
        scale: 0.8;
      }
    }
  `,
  modelWithControl: css`
    border-radius: 20px;

    :hover {
      background: ${token.colorFillTertiary};
    }
  `,

  video: css`
    overflow: hidden;
    border-radius: 8px;
  `,
}));

const ModelSwitch = memo(() => {
  const { styles, cx } = useStyles();

  const [model] = useAgentStore((s) => [agentSelectors.currentAgentModel(s)]);

  return (
    <Flexbox align={'center'} className={styles.container} horizontal>
      <ModelSwitchPanel>
        <Center className={cx(styles.model, styles.modelWithControl)} height={36} width={36}>
          <div className={styles.icon}>
            <ModelIcon model={model} size={22} />
          </div>
        </Center>
      </ModelSwitchPanel>
    </Flexbox>
  );
});

ModelSwitch.displayName = 'ModelSwitch';

export default ModelSwitch;
