import { LobeBuiltinTool } from '@/types/tool';

import { ArtifactsManifest } from './artifacts';
// import { DalleManifest } from './dalle';
import { LocalSystemManifest } from './local-system';
// import { WebBrowsingManifest } from './web-browsing';

export const builtinTools: LobeBuiltinTool[] = [
  {
    identifier: ArtifactsManifest.identifier,
    manifest: ArtifactsManifest,
    type: 'builtin',
  },
  // {
  //   identifier: DalleManifest.identifier,
  //   manifest: DalleManifest,
  //   type: 'builtin',
  // },
  {
    hidden: false,
    identifier: LocalSystemManifest.identifier,
    manifest: LocalSystemManifest,
    type: 'builtin',
  },
  // {
  //   hidden: true,
  //   identifier: WebBrowsingManifest.identifier,
  //   manifest: WebBrowsingManifest,
  //   type: 'builtin',
  // },
];
