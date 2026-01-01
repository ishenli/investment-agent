import React, { Suspense, lazy } from 'react';
import Layout from './PortalLayout';
import Loading from '../../../components/Loading/BrandTextLoading';
const PortalBody = lazy(() => import('../../../features/Portal/router'));

const Inspector = () => {

  return (
    <Suspense fallback={<Loading />}>
      <Layout>
        <PortalBody />
      </Layout>
    </Suspense>
  );
};

Inspector.displayName = 'ChatInspector';

export default Inspector;
