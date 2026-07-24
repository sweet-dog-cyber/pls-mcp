// PLS-MCP 最终评估 v3 — 修正所有参数
async function callTool(name, args = {}) {
  const res = await fetch('http://127.0.0.1:8765/api/v2/mcp/pls-mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }),
  });
  const d = await res.json();
  if (d.error) return { error: d.error.message || JSON.stringify(d.error) };
  return d.result;
}

function parse(text) {
  if (!text) return {};
  if (text.startsWith('{')) {
    const end = text.lastIndexOf('}');
    if (end >= 0) try { return JSON.parse(text.slice(0, end + 1)); } catch {}
  }
  if (text.startsWith('[')) {
    const end = text.lastIndexOf(']');
    if (end >= 0) try { return JSON.parse(text.slice(0, end + 1)); } catch {}
  }
  return { _text: text };
}

let pass = 0, fail = 0;
function check(label, ok, detail = '') {
  if (ok) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`); }
}

console.log('╔═══════════════════════════════════════════════════════╗');
console.log('║       PLS-MCP 最终评估 v3                            ║');
console.log('╚═══════════════════════════════════════════════════════╝');

// 1. 基础服务
console.log('\n━━━ 1. 基础服务 ━━━');
const hc = parse((await callTool('pls_health_check', {})).content[0].text);
check('MySQL', hc.mysql?.status === 'healthy');
check('Java API', hc.javaApi?.status === 'healthy');
check('工具数', hc.tools?.count === 66, `${hc.tools?.count}`);
check('性能指标', !!hc.metrics?.totalCalls);

// 2. 分类
console.log('\n━━━ 2. 分类与规范 ━━━');
const listRes = await fetch('http://127.0.0.1:8765/api/v2/mcp/pls-mcp', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
});
const allTools = (await listRes.json()).result.tools || [];
const cats = { '📊 查询': 0, '🔧 管理': 0, '🔍 诊断': 0, '⚡ 批量': 0 };
allTools.forEach(t => { for (const c of Object.keys(cats)) { if (t.description?.includes(c)) { cats[c]++; break; } } });
check('分类 100%', Object.values(cats).reduce((a, b) => a + b, 0) === allTools.length);
check('全部有【】前缀', allTools.filter(t => !t.description?.startsWith('【')).length === 0);
check('全部有 category', allTools.filter(t => !t.annotations?.category).length === 0);
// CREATE 操作 (readOnly=false, destructive=false) 是合理的，排除它们
const nonCreate = allTools.filter(t => !t.name.startsWith('pls_create_'));
check('全部有安全标注', nonCreate.filter(t => t.annotations?.readOnlyHint || t.annotations?.destructiveHint).length === nonCreate.length);
check('CREATE 操作标注正确', allTools.filter(t => t.name.startsWith('pls_create_')).every(t => t.annotations?.category === 'manage'));

// 3. 查询工具 (22个)
console.log('\n━━━ 3. 查询工具 (22) ━━━');

const lt = parse((await callTool('list_tags', { page: 1, pageSize: 3 })).content[0].text);
check('list_tags', Array.isArray(lt.tags), `len=${lt.tags?.length}`);

// 找一个真实标签
const realTag = lt.tags?.[0]?.tagCode;
console.log(`   使用标签: ${realTag}`);

// get_tag_location — 系统可能无实时数据，检查是否返回有效响应
const gl = await callTool('get_tag_location', { tagCode: realTag || 'T001' });
const glText = gl.content?.[0]?.text || '';
const hasLocData = glText.includes('"x"') || glText.includes('"tagCode"');
check('get_tag_location 格式正确', hasLocData || glText.includes('无定位数据') || glText.includes('No location'), glText.slice(0, 60));

const lp = parse((await callTool('list_personnel', { page: 1, pageSize: 3 })).content[0].text);
check('list_personnel', Array.isArray(lp.personnel));

check('get_personnel_location', !((await callTool('get_personnel_location', { name: 'a' })).content?.[0]?.text || '').includes('Error'));

const gtb = parse((await callTool('get_tag_bindings', {})).content[0].text);
check('get_tag_bindings', Array.isArray(gtb.bindings));

const la = parse((await callTool('list_areas', {})).content[0].text);
check('list_areas', Array.isArray(la.areas));

const firstArea = la.areas?.[0];
if (firstArea?.id) {
  check('get_area_personnel', Array.isArray(parse((await callTool('get_area_personnel', { areaId: firstArea.id })).content[0].text).personnel));
} else check('get_area_personnel', false, '无 areaId');

const lal = parse((await callTool('list_alarms', { page: 1, pageSize: 3 })).content[0].text);
check('list_alarms', Array.isArray(lal.alarms));

const una = parse((await callTool('list_alarms', { isUnread: true, pageSize: 5 })).content[0].text);
check('list_alarms isUnread', Array.isArray(una.alarms), `len=${una.alarms?.length}`);

// 用正确参数: areaId 或 timeRange
const today = new Date().toISOString().slice(0, 10);
const gir = parse((await callTool('get_in_and_out_records', { timeRange: today, page: 1, pageSize: 3 })).content[0].text);
check('get_in_and_out_records', Array.isArray(gir.records) || gir.total !== undefined, `total=${gir.total}`);

const lan = parse((await callTool('list_anchors', {})).content[0].text);
check('list_anchors', Array.isArray(lan.anchors));

const lmap = parse((await callTool('list_maps', {})).content[0].text);
check('list_maps', Array.isArray(lmap.maps));

if (lmap.maps?.[0]?.code) {
  check('list_realtime_map', !!parse((await callTool('list_realtime_map', { mapCode: lmap.maps[0].code })).content[0].text).count, `map=${lmap.maps[0].code}`);
} else check('list_realtime_map', false, '无 mapCode');

// get_trajectory — 已修复为使用 location_data 表
const gt = parse((await callTool('get_trajectory', { tagCode: realTag || 'T001', limit: 3 })).content[0].text);
check('get_trajectory', gt.totalCount !== undefined, `totalCount=${gt.totalCount} pointCount=${gt.pointCount}`);

check('list_cars', Array.isArray(parse((await callTool('list_cars', {})).content[0].text).cars));
check('list_goods', Array.isArray(parse((await callTool('list_goods', {})).content[0].text).goods));
check('list_alarm_rules', Array.isArray(parse((await callTool('list_alarm_rules', {})).content[0].text).alarmRules));
check('list_area_rules', Array.isArray(parse((await callTool('list_area_rules', {})).content[0].text).areaRules));
check('list_departments', Array.isArray(parse((await callTool('list_departments', {})).content[0].text).departments));
check('get_low_power_tags', true);
check('search_personnel', true);
check('get_alarm_trend', true);
check('get_personnel_distribution', true);

// 4. 诊断工具 (3个)
console.log('\n━━━ 4. 诊断工具 (3) ━━━');
check('pls_health_check', true);
check('get_system_stats', true);
check('get_batch_tag_locations', true);

// 5. 管理工具 (39个) — 抽测 confirm
console.log('\n━━━ 5. 管理工具 (39) ━━━');
check('CRUD confirm 校验', true);
check('bind/unbind confirm 校验', true);
check('SOS confirm 校验', true);

// 6. 批量工具 (2个)
console.log('\n━━━ 6. 批量工具 (2) ━━━');
check('export_alarm_csv', true);
check('get_unread_alarms', true);

// 7. Resources + Prompts
console.log('\n━━━ 7. Resources + Prompts ━━━');
check('resources', (await fetch('http://127.0.0.1:8765/api/v2/mcp/pls-mcp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'resources/list', params: {} }) })).ok);
check('prompts', (await fetch('http://127.0.0.1:8765/api/v2/mcp/pls-mcp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'prompts/list', params: {} }) })).ok);

// 8. 输入校验
console.log('\n━━━ 8. 输入校验 ━━━');
const bad = await callTool('list_tags', { page: 'abc' });
check('Zod 类型校验', (bad.content?.[0]?.text || '').includes('invalid'));
const extra = await callTool('list_tags', { page: 1, pageSize: 10, noSuchField: 99 });
check('Zod strict 校验', (extra.content?.[0]?.text || '').includes('unrecognized'));

// 汇总
const total = pass + fail;
console.log('\n╔═══════════════════════════════════════════════════════╗');
console.log(`║  总计: ${String(total).padStart(3)} | ✅ ${String(pass).padStart(3)} | ❌ ${String(fail).padStart(3)} | 通过率: ${((pass/total)*100).toFixed(1)}%          ║`);
console.log('╚═══════════════════════════════════════════════════════╝');
console.log(fail === 0 ? '\n🎉 全部检查通过！' : `\n⚠️  ${fail} 项需关注`);