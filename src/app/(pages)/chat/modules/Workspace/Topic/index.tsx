// import TopicListContent from './features/TopicListContent';
import React, { Suspense, lazy } from 'react';
import TopicLayout from './TopicLayout';
import SkeletonList from './components/SkeletonList';
import SystemRole from './components/SystemRole';

const TopicContent = lazy(() => import('./components/TopicListContent'));

const Topic = () => {
  return (
    <>
      <SystemRole />
      <TopicLayout>
        <Suspense fallback={<SkeletonList />}>
          <TopicContent />
        </Suspense>
      </TopicLayout>
    </>
  );
};

Topic.displayName = 'ChatTopic';

export default Topic;
