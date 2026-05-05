'use client';

import React, { memo } from 'react';
import { Descriptions } from 'antd';
import type { SpanData } from '@renderer/store/observability/store';

interface SpanDetailProps {
  span: SpanData | null;
}

const SpanDetail = memo<SpanDetailProps>(({ span }) => {
  if (!span) return null;

  return (
    <Descriptions column={1} size="small" title={span.name}>
      <Descriptions.Item label="状态">{span.status}</Descriptions.Item>
      <Descriptions.Item label="类型">{span.kind}</Descriptions.Item>
      {span.durationMs !== undefined && (
        <Descriptions.Item label="耗时">{`${span.durationMs}ms`}</Descriptions.Item>
      )}
      {span.tokenInput !== undefined && (
        <Descriptions.Item label="Input Tokens">{span.tokenInput}</Descriptions.Item>
      )}
      {span.tokenOutput !== undefined && (
        <Descriptions.Item label="Output Tokens">{span.tokenOutput}</Descriptions.Item>
      )}
      {span.cost !== undefined && (
        <Descriptions.Item label="成本">{`$${span.cost.toFixed(6)}`}</Descriptions.Item>
      )}
      {span.attributes && Object.keys(span.attributes).length > 0 && (
        <Descriptions.Item label="属性">
          <pre style={{ fontSize: 11, margin: 0, whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(span.attributes, null, 2)}
          </pre>
        </Descriptions.Item>
      )}
    </Descriptions>
  );
});

SpanDetail.displayName = 'SpanDetail';

export default SpanDetail;
