'use client';

import { Suspense, memo } from 'react';
import { createStyles } from 'antd-style';
import { Flexbox } from 'react-layout-kit';

import type { UIArtifact } from './schemas';
import { UI_ARTIFACT_PROPS_SCHEMAS } from './schemas';
import { getArtifactComponent } from './registry';
import Fallback from './Fallback';
import ArtifactSkeleton from './ArtifactSkeleton';

const useStyles = createStyles(({ css }) => ({
  container: css`
    margin-top: 12px;
  `,
  artifactEnter: css`
    animation: artifactEnter 0.35s ease both;

    @keyframes artifactEnter {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,
}));

interface GenerativeUIRendererProps {
  artifacts?: UIArtifact[];
  generating?: boolean;
  pendingCount?: number;
}

const ArtifactItem = memo<{ artifact: UIArtifact }>(({ artifact }) => {
  const Component = getArtifactComponent(artifact.type);

  if (!Component) {
    return <Fallback artifact={artifact} />;
  }

  const propsSchema = UI_ARTIFACT_PROPS_SCHEMAS[artifact.type];
  if (!propsSchema) {
    return <Fallback artifact={artifact} />;
  }

  const result = propsSchema.safeParse(artifact.props);
  if (!result.success) {
    return <Fallback artifact={artifact} />;
  }

  const validatedProps = result.data as Record<string, unknown>;

  return (
    <Suspense>
      <Component {...validatedProps} />
    </Suspense>
  );
});

ArtifactItem.displayName = 'ArtifactItem';

const GenerativeUIRenderer = memo<GenerativeUIRendererProps>(
  ({ artifacts, generating, pendingCount = 0 }) => {
    const { styles, cx } = useStyles();

    const hasArtifacts = artifacts && artifacts.length > 0;
    const showSkeletons = generating && pendingCount > 0;

    if (!hasArtifacts && !showSkeletons) return null;

    return (
      <Flexbox className={styles.container} gap={12}>
        {hasArtifacts &&
          artifacts.map((artifact, index) => (
            <div
              className={styles.artifactEnter}
              key={artifact.id}
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <ArtifactItem artifact={artifact} />
            </div>
          ))}
        {showSkeletons &&
          Array.from({ length: pendingCount }).map((_, i) => (
            <ArtifactSkeleton key={`skeleton-${i}`} />
          ))}
      </Flexbox>
    );
  },
);

GenerativeUIRenderer.displayName = 'GenerativeUIRenderer';

export default GenerativeUIRenderer;
