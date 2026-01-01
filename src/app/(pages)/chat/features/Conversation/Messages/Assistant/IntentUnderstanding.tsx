import { Flexbox } from 'react-layout-kit';

import CircleLoader from '@renderer/(pages)/chat/components/CircleLoader';
import React from 'react';

const IntentUnderstanding = () => {
  return (
    <Flexbox align={'center'} gap={8} horizontal>
      <CircleLoader />
      <Flexbox horizontal>intentUnderstanding.title</Flexbox>
    </Flexbox>
  );
};
export default IntentUnderstanding;
