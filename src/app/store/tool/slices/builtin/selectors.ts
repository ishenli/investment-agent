import { LobeToolMeta } from '@typings/tool/tool';

import type { ToolStoreState } from '../../initialState';

const metaList =
  (showDalle?: boolean) =>
  (s: ToolStoreState): LobeToolMeta[] =>
    s.builtinTools
      .filter(
        (item) =>
          !item.hidden,
      )
      .map((t) => ({
        author: 'LobeHub',
        identifier: t.identifier,
        meta: t.manifest.meta,
        type: 'builtin',
      }));

export const builtinToolSelectors = {
  metaList,
};
