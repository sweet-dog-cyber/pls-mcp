import { server, z } from '../server.js';
import { callMcpWrite } from '../api/client.js';
import { log } from '../config/settings.js';
import { DESTRUCTIVE_ANNOTATIONS } from '../constants.js';
import { truncateOutput } from '../utils/truncate.js';

function registerWriteTool(name: string, description: string, path: string, hasTagId: boolean) {
  const schemaObj: any = {
    entityId: z.string().describe('实体ID（人员/车辆/物品ID），长整型数字请以字符串传入避免精度丢失'),
  };
  if (hasTagId) {
    schemaObj.tagId = z.string().describe('标签ID，长整型数字请以字符串传入避免精度丢失');
  }

  server.registerTool(name, {
    title: name,
    description,
    annotations: DESTRUCTIVE_ANNOTATIONS,
    inputSchema: z.object(schemaObj).strict(),
  }, async (args: any) => {
    try {
      const res = await callMcpWrite(path, args);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: res?.result === true || res?.code === 200,
            entityId: args.entityId,
            ...(hasTagId ? { tagId: args.tagId } : {}),
          }, null, 2),
        }],
      };
    } catch (err: any) {
      log(`Error in ${name}:`, err.message);
      return { content: [{ type: 'text', text: `Error: ${name} 失败 - ${err.message}` }], isError: true };
    }
  });
}

// ── Person bind/unbind ──
registerWriteTool('pls_bind_tag_to_person',
  `将标签绑定到人员。

参数:
  - entityId: 人员ID（必填）
  - tagId: 标签ID（必填）

注意: 标签不能已被其他实体绑定`,
  'bind/person', true);

registerWriteTool('pls_unbind_tag_from_person',
  `解除人员与标签的绑定。

参数:
  - entityId: 人员ID（必填）

注意: 解绑后标签变为未绑定状态`,
  'unbind/person', false);

// ── Car bind/unbind ──
registerWriteTool('pls_bind_tag_to_car',
  `将标签绑定到车辆。

参数:
  - entityId: 车辆ID（必填）
  - tagId: 标签ID（必填）`,
  'bind/car', true);

registerWriteTool('pls_unbind_tag_from_car',
  `解除车辆与标签的绑定。

参数:
  - entityId: 车辆ID（必填）`,
  'unbind/car', false);

// ── Goods bind/unbind ──
registerWriteTool('pls_bind_tag_to_goods',
  `将标签绑定到物品/货物。

参数:
  - entityId: 物品ID（必填）
  - tagId: 标签ID（必填）`,
  'bind/goods', true);

registerWriteTool('pls_unbind_tag_from_goods',
  `解除物品/货物与标签的绑定。

参数:
  - entityId: 物品ID（必填）`,
  'unbind/goods', false);