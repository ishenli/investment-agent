import { BaseBizController } from './base';
import { buildToolMetadataList } from '@server/core/tools/toolMetadata';

export class ToolBizController extends BaseBizController {
  list() {
    const tools = buildToolMetadataList();
    return this.success({
      builtinTools: tools.filter((t) => t.source === 'builtin'),
      businessTools: tools.filter((t) => t.source === 'business'),
    });
  }
}
