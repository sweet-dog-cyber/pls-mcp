import { server, z } from '../server.js';
import { callMcpWrite } from '../api/client.js';
import { log } from '../config/settings.js';

const ENTITY_TYPES = ['tag', 'person', 'car', 'goods', 'area', 'anchor', 'alarm_rule', 'building', 'map', 'area_rule'] as const;
type EntityType = typeof ENTITY_TYPES[number];

function registerCrudTool(name: string, description: string, entity: EntityType, action: 'add' | 'update' | 'delete') {
  const isDelete = action === 'delete';

  server.registerTool(name, {
    title: name,
    description: `${action === 'add' ? '创建' : action === 'update' ? '更新' : '删除'}${entity === 'alarm_rule' ? '告警规则' : entity === 'area_rule' ? '区域规则' : entity}实体。

参数:
${isDelete
  ? '  - ids: ID数组（必填），要删除的实体ID列表'
  : '  - 实体字段（必填），根据实体类型传入对应字段。例如:\n    - tag: { tagCode, model, tagType, ... }\n    - person: { name, departmentId, phone, ... }\n    - car: { carCode, carType, machineCode, ... }\n    - goods: { code, name, ... }'
}

注意: ${action === 'delete' ? '删除操作不可撤销' : '只传需要设置的字段，未传字段保持不变'}`
  }, async (args: any) => {
    try {
      const payload = isDelete ? { ids: args.ids } : args;
      const res = await callMcpWrite(`${entity}/${action}`, payload);
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: res?.result === true || res?.code === 200, entity, action, args }, null, 2) }],
      };
    } catch (err: any) {
      log(`Error in ${name}:`, err.message);
      return { content: [{ type: 'text', text: `Error: ${name} 失败 - ${err.message}` }], isError: true };
    }
  });
}

// ── Tag CRUD ──
registerCrudTool('pls_create_tag', '', 'tag', 'add');
registerCrudTool('pls_update_tag', '', 'tag', 'update');
registerCrudTool('pls_delete_tag', '', 'tag', 'delete');

// ── Person CRUD ──
registerCrudTool('pls_create_person', '', 'person', 'add');
registerCrudTool('pls_update_person', '', 'person', 'update');
registerCrudTool('pls_delete_person', '', 'person', 'delete');

// ── Car CRUD ──
registerCrudTool('pls_create_car', '', 'car', 'add');
registerCrudTool('pls_update_car', '', 'car', 'update');
registerCrudTool('pls_delete_car', '', 'car', 'delete');

// ── Goods CRUD ──
registerCrudTool('pls_create_goods', '', 'goods', 'add');
registerCrudTool('pls_update_goods', '', 'goods', 'update');
registerCrudTool('pls_delete_goods', '', 'goods', 'delete');

// ── Area CRUD ──
registerCrudTool('pls_create_area', '', 'area', 'add');
registerCrudTool('pls_update_area', '', 'area', 'update');
registerCrudTool('pls_delete_area', '', 'area', 'delete');

// ── Anchor CRUD ──
registerCrudTool('pls_create_anchor', '', 'anchor', 'add');
registerCrudTool('pls_update_anchor', '', 'anchor', 'update');
registerCrudTool('pls_delete_anchor', '', 'anchor', 'delete');

// ── Alarm Rule CRUD ──
registerCrudTool('pls_create_alarm_rule', '', 'alarm_rule', 'add');
registerCrudTool('pls_update_alarm_rule', '', 'alarm_rule', 'update');
registerCrudTool('pls_delete_alarm_rule', '', 'alarm_rule', 'delete');

// ── Building CRUD ──
registerCrudTool('pls_create_building', '', 'building', 'add');
registerCrudTool('pls_update_building', '', 'building', 'update');
registerCrudTool('pls_delete_building', '', 'building', 'delete');

// ── Map CRUD ──
registerCrudTool('pls_create_map', '', 'map', 'add');
registerCrudTool('pls_update_map', '', 'map', 'update');
registerCrudTool('pls_delete_map', '', 'map', 'delete');

// ── Area Rule CRUD ──
registerCrudTool('pls_create_area_rule', '', 'area_rule', 'add');
registerCrudTool('pls_update_area_rule', '', 'area_rule', 'update');
registerCrudTool('pls_delete_area_rule', '', 'area_rule', 'delete');
