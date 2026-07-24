import { server, z } from '../server.js';
import { callMcpWrite } from '../api/client.js';
import { log } from '../config/settings.js';
import { MANAGE_ANNOTATIONS, CREATE_ANNOTATIONS, checkConfirm } from '../constants.js';
import { ENTITY_SCHEMA_MAP, ENTITY_NAME_MAP, DeleteSchema } from '../types/schemas.js';
import { truncateOutput } from '../utils/truncate.js';

const ENTITY_TYPES = ['tag', 'person', 'car', 'goods', 'area', 'anchor', 'alarm_rule', 'building', 'map', 'area_rule'] as const;
type EntityType = typeof ENTITY_TYPES[number];

function registerCrudTool(name: string, entity: EntityType, action: 'add' | 'update' | 'delete') {
  const isDelete = action === 'delete';
  const isUpdate = action === 'update';
  const entityName = ENTITY_NAME_MAP[entity] || entity;

  let annotations: any;
  if (action === 'delete') {
    annotations = MANAGE_ANNOTATIONS;
  } else if (action === 'update') {
    annotations = MANAGE_ANNOTATIONS;
  } else {
    annotations = CREATE_ANNOTATIONS;
  }

  const inputSchema = isDelete
    ? DeleteSchema
    : ENTITY_SCHEMA_MAP[entity];

  // D3: delete 和 update 需要 confirm 确认
  const finalSchema = (isDelete || isUpdate)
    ? z.object({
      confirm: z.literal('确认').describe('⚠️ 写操作需二次确认，必须传 "确认"'),
      ...((isDelete ? { ids: (DeleteSchema as any).shape.ids } : {}) as any),
      ...((ENTITY_SCHEMA_MAP[entity] as any).shape),
    }).strict()
    : inputSchema;

  const fieldList = isDelete
    ? 'confirm + ids (ID数组)'
    : 'confirm + 实体字段';

  server.registerTool(name, {
    title: name,
    description: `【🔧 管理】${action === 'add' ? '创建' : action === 'update' ? '更新' : '删除'}${entityName}实体。

参数:
  - confirm: 二次确认（必填），必须传 "确认"
${isDelete ? '  - ids: ID数组（必填），要删除的实体ID列表\n' : ''}  - 根据实体类型传入对应字段

返回: {success: true/false, entity: 实体名称, action: 操作类型}

提示: ${action === 'delete' ? '删除不可撤销！' : action === 'update' ? '确认+只传需改字段' : '确认+只传必填字段'}
`,
    annotations,
    inputSchema: finalSchema,
  }, async (args: any) => {
    try {
      // D3: 校验 confirm
      if (isDelete || isUpdate) {
        checkConfirm(args.confirm, `${action === 'delete' ? '删除' : '更新'}${entityName}`);
      }

      const payload = isDelete ? { ids: args.ids } : args;
      const res = await callMcpWrite(`${entity}/${action}`, payload);
      const success = res?.result === true || res?.code === 200;
      const result = { success, entity: entityName, action, args };
      const { text, truncated } = truncateOutput(JSON.stringify(result, null, 2));
      return {
        content: [{
          type: 'text',
          text: truncated ? text + '\n\n⚠️ [输出已截断]' : text,
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

// ── Tag CRUD ──
registerCrudTool('pls_create_tag', 'tag', 'add');
registerCrudTool('pls_update_tag', 'tag', 'update');
registerCrudTool('pls_delete_tag', 'tag', 'delete');

// ── Person CRUD ──
registerCrudTool('pls_create_person', 'person', 'add');
registerCrudTool('pls_update_person', 'person', 'update');
registerCrudTool('pls_delete_person', 'person', 'delete');

// ── Car CRUD ──
registerCrudTool('pls_create_car', 'car', 'add');
registerCrudTool('pls_update_car', 'car', 'update');
registerCrudTool('pls_delete_car', 'car', 'delete');

// ── Goods CRUD ──
registerCrudTool('pls_create_goods', 'goods', 'add');
registerCrudTool('pls_update_goods', 'goods', 'update');
registerCrudTool('pls_delete_goods', 'goods', 'delete');

// ── Area CRUD ──
registerCrudTool('pls_create_area', 'area', 'add');
registerCrudTool('pls_update_area', 'area', 'update');
registerCrudTool('pls_delete_area', 'area', 'delete');

// ── Anchor CRUD ──
registerCrudTool('pls_create_anchor', 'anchor', 'add');
registerCrudTool('pls_update_anchor', 'anchor', 'update');
registerCrudTool('pls_delete_anchor', 'anchor', 'delete');

// ── Alarm Rule CRUD ──
registerCrudTool('pls_create_alarm_rule', 'alarm_rule', 'add');
registerCrudTool('pls_update_alarm_rule', 'alarm_rule', 'update');
registerCrudTool('pls_delete_alarm_rule', 'alarm_rule', 'delete');

// ── Building CRUD ──
registerCrudTool('pls_create_building', 'building', 'add');
registerCrudTool('pls_update_building', 'building', 'update');
registerCrudTool('pls_delete_building', 'building', 'delete');

// ── Map CRUD ──
registerCrudTool('pls_create_map', 'map', 'add');
registerCrudTool('pls_update_map', 'map', 'update');
registerCrudTool('pls_delete_map', 'map', 'delete');

// ── Area Rule CRUD ──
registerCrudTool('pls_create_area_rule', 'area_rule', 'add');
registerCrudTool('pls_update_area_rule', 'area_rule', 'update');
registerCrudTool('pls_delete_area_rule', 'area_rule', 'delete');