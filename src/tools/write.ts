import { server, z } from '../server.js';
import { callMcpWrite } from '../api/client.js';
import { log } from '../config/settings.js';
import { MANAGE_ANNOTATIONS, checkConfirm } from '../constants.js';
import { truncateOutput } from '../utils/truncate.js';

function registerWriteTool(name: string, description: string, path: string, hasTagId: boolean) {
  const schemaObj: any = {
    confirm: z.literal('确认').describe('⚠️ 写操作需二次确认，必须传 "确认"'),
    entityId: z.string().describe('实体ID（人员/车辆/物品ID），长整型数字请以字符串传入避免精度丢失'),
  };
  if (hasTagId) {
    schemaObj.tagId = z.string().describe('标签ID，长整型数字请以字符串传入避免精度丢失');
  }

  server.registerTool(name, {
    title: name,
    description: `【🔧 管理】${description}

注意: 必须传 confirm: "确认" 才能执行`,
    annotations: MANAGE_ANNOTATIONS,
    inputSchema: z.object(schemaObj).strict(),
  }, async (args: any) => {
    try {
      // D3: 校验 confirm
      checkConfirm(args.confirm, '绑定/解绑操作');

      const res = await callMcpWrite(path, { entityId: args.entityId, ...(hasTagId ? { tagId: args.tagId } : {}) });
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
      if (err.message.includes('需二次确认')) {
        return { content: [{ type: 'text', text: err.message }], isError: true };
      }
      log(`Error in ${name}:`, err.message);
      return { content: [{ type: 'text', text: `Error: ${name} 失败 - ${err.message}` }], isError: true };
    }
  });
}

// ── Person bind/unbind ──
registerWriteTool('pls_bind_tag_to_person',
  `将标签绑定到人员。

参数:
  - confirm: 二次确认（必填），必须传 "确认"
  - entityId: 人员ID（必填）
  - tagId: 标签ID（必填）

返回: 操作结果

提示: 确认绑定关系后再执行`,
  'bind/person', true);

registerWriteTool('pls_unbind_tag_from_person',
  `解除人员与标签的绑定。

参数:
  - confirm: 二次确认（必填），必须传 "确认"
  - entityId: 人员ID（必填）

返回: 操作结果

提示: 解绑后人员失去定位能力`,
  'unbind/person', false);

// ── Car bind/unbind ──
registerWriteTool('pls_bind_tag_to_car',
  `将标签绑定到车辆。

参数:
  - confirm: 二次确认（必填），必须传 "确认"
  - entityId: 车辆ID（必填）
  - tagId: 标签ID（必填）

返回: 操作结果

提示: 确认绑定关系后再执行`,
  'bind/car', true);

registerWriteTool('pls_unbind_tag_from_car',
  `解除车辆与标签的绑定。

参数:
  - confirm: 二次确认（必填），必须传 "确认"
  - entityId: 车辆ID（必填）

返回: 操作结果

提示: 解绑后车辆失去定位能力`,
  'unbind/car', false);

// ── Goods bind/unbind ──
registerWriteTool('pls_bind_tag_to_goods',
  `将标签绑定到物品/货物。

参数:
  - confirm: 二次确认（必填），必须传 "确认"
  - entityId: 物品ID（必填）
  - tagId: 标签ID（必填）

返回: 操作结果

提示: 确认绑定关系后再执行`,
  'bind/goods', true);

registerWriteTool('pls_unbind_tag_from_goods',
  `解除物品/货物与标签的绑定。

参数:
  - confirm: 二次确认（必填），必须传 "确认"
  - entityId: 物品ID（必填）

返回: 操作结果

提示: 解绑后物品失去定位能力`,
  'unbind/goods', false);