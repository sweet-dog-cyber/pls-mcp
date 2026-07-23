import { server } from '../server.js';
import { callMcpWrite } from '../api/client.js';
import { log } from '../config/settings.js';
import { DESTRUCTIVE_ANNOTATIONS, CREATE_ANNOTATIONS } from '../constants.js';
import { ENTITY_SCHEMA_MAP, ENTITY_NAME_MAP, DeleteSchema } from '../types/schemas.js';
import { truncateOutput } from '../utils/truncate.js';
const ENTITY_TYPES = ['tag', 'person', 'car', 'goods', 'area', 'anchor', 'alarm_rule', 'building', 'map', 'area_rule'];
function registerCrudTool(name, entity, action) {
    const isDelete = action === 'delete';
    const entityName = ENTITY_NAME_MAP[entity] || entity;
    let annotations;
    if (action === 'delete') {
        annotations = DESTRUCTIVE_ANNOTATIONS;
    }
    else if (action === 'update') {
        annotations = DESTRUCTIVE_ANNOTATIONS;
    }
    else {
        annotations = CREATE_ANNOTATIONS;
    }
    const inputSchema = isDelete
        ? DeleteSchema
        : ENTITY_SCHEMA_MAP[entity];
    const fieldList = isDelete
        ? 'ids (ID数组)'
        : ('shape' in inputSchema ? Object.keys(inputSchema.shape).join(', ') : '');
    server.registerTool(name, {
        title: name,
        description: `${action === 'add' ? '创建' : action === 'update' ? '更新' : '删除'}${entityName}实体。

参数:
  - ${fieldList}

注意: ${action === 'delete' ? '删除操作不可撤销，请确认后再执行' : '只传需要设置的字段，未传字段保持不变'}
`,
        annotations,
        inputSchema,
    }, async (args) => {
        try {
            const payload = isDelete ? { ids: args.ids } : args;
            const res = await callMcpWrite(`${entity}/${action}`, payload);
            const success = res?.result === true || res?.code === 200;
            const result = {
                success,
                entity: entityName,
                action,
                args,
            };
            const { text, truncated } = truncateOutput(JSON.stringify(result, null, 2));
            return {
                content: [{
                        type: 'text',
                        text: truncated ? text + '\n\n⚠️ [输出已截断]' : text,
                    }],
            };
        }
        catch (err) {
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
//# sourceMappingURL=crud.js.map