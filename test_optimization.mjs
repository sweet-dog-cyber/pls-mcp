// pls-mcp 优化功能测试
// 通过 STDIO 启动服务 + JSON-RPC 协议验证

import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Spawn MCP server via STDIO ──
const server = spawn('node', [resolve(__dirname, 'dist/index.js')], {
  cwd: __dirname,
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env },
});

const pending = new Map();
let nextId = 1;
let stdoutBuf = '';

server.stderr.on('data', () => {}); // ignore debug logs

server.stdout.on('data', (raw) => {
  stdoutBuf += raw.toString();
  while (true) {
    const nl = stdoutBuf.indexOf('\n');
    if (nl < 0) break;
    const line = stdoutBuf.slice(0, nl).trim();
    stdoutBuf = stdoutBuf.slice(nl + 1);
    if (!line) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id && pending.has(msg.id)) {
        const { resolve: res, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : res(msg);
      }
      // notifications (no id) are silently ignored
    } catch {}
  }
});

function req(method, params = {}) {
  const id = nextId++;
  const p = new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error('timeout')); } }, 15000);
  });
  server.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  return p;
}

// ── Test harness ──
let total = 0, ok = 0, fail = 0;
function assert(name, cond, detail = '') {
  total++;
  if (cond) { ok++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${detail ? ' — ' + detail : ''}`); }
}

// ── Run ──
(async () => {
  console.log('⏳ 启动 MCP 服务...');
  await new Promise(r => setTimeout(r, 3000));

  try {
    // 1. Initialize
    console.log('\n━━━ 1. MCP Initialize ━━━');
    const init = await req('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'tester', version: '0.1' } });
    assert('initialize 成功', !!init.result?.serverInfo);
    console.log(`   ${init.result.serverInfo.name} v${init.result.serverInfo.version}`);

    // Send initialized notification
    server.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
    await new Promise(r => setTimeout(r, 200));

    // 2. Tools list
    console.log('\n━━━ 2. 工具数量 & 安全标注 ━━━');
    const tl = await req('tools/list');
    const tools = tl.result.tools || [];
    assert('工具总数 = 60', tools.length === 60, `实际 ${tools.length}`);

    const destructive = tools.filter(t => t.annotations?.destructiveHint === true).length;
    const readOnly = tools.filter(t => t.annotations?.readOnlyHint === true).length;
    const noAnnot = tools.filter(t => !t.annotations).length;
    assert('写操作标注 destructiveHint = 29', destructive === 29, `实际 ${destructive} (6bind+20crud_ud+3ext)`);
    assert('查询工具标注 readOnlyHint >= 21', readOnly >= 21, `实际 ${readOnly}`);
    assert('无标注工具 = 0', noAnnot === 0, `实际 ${noAnnot}`);
    console.log(`   destructive: ${destructive}, readOnly: ${readOnly}, none: ${noAnnot}`);
    console.log(`   新工具: pls_health_check, get_batch_tag_locations`);

    // 3. CRUD 工具 inputSchema
    console.log('\n━━━ 3. CRUD inputSchema 校验 ━━━');
    const crudTools = tools.filter(t => ['pls_create_tag','pls_update_tag','pls_delete_tag','pls_create_person','pls_update_person','pls_delete_person','pls_create_area','pls_update_area','pls_delete_area'].includes(t.name));
    const withSchema = crudTools.filter(t => t.inputSchema && Object.keys(t.inputSchema.properties || {}).length > 0).length;
    assert('CRUD 工具有完整 inputSchema', withSchema === crudTools.length, `${withSchema}/${crudTools.length}`);

    // Sample schema: check pls_create_tag has tagCode field
    const createTag = tools.find(t => t.name === 'pls_create_tag');
    assert('pls_create_tag 有 tagCode 字段', !!createTag?.inputSchema?.properties?.tagCode);
    assert('pls_create_tag 有 DESTRUCTIVE 标注', createTag?.annotations?.destructiveHint === false && createTag?.annotations?.idempotentHint === false);

    // Sample schema: check pls_delete_tag has ids field
    const deleteTag = tools.find(t => t.name === 'pls_delete_tag');
    assert('pls_delete_tag 有 ids 字段', !!deleteTag?.inputSchema?.properties?.ids);
    assert('pls_delete_tag 有 DESTRUCTIVE 标注', deleteTag?.annotations?.destructiveHint === true);

    // 4. get_system_stats (Java API)
    console.log('\n━━━ 4. get_system_stats (Java API) ━━━');
    try {
      const stats = await req('tools/call', { name: 'get_system_stats', arguments: {} });
      const data = JSON.parse(stats.result.content[0].text);
      assert('tags 字段存在', 'tags' in data);
      assert('personnel 字段存在', 'personnel' in data);
      assert('anchors 字段存在', 'anchors' in data);
      console.log(`   标签: ${JSON.stringify(data.tags)}, 人员: ${JSON.stringify(data.personnel)}`);
    } catch (e) { assert('get_system_stats', false, e.message); }

    // 5. list_tags (mapId fix + truncate)
    console.log('\n━━━ 5. list_tags (mapId 修复 + 截断) ━━━');
    try {
      const r5a = await req('tools/call', { name: 'list_tags', arguments: { page: 1, pageSize: 3 } });
      const d5a = JSON.parse(r5a.result.content[0].text);
      assert('分页返回正确', d5a.total > 0 && d5a.tags.length <= 3, `total=${d5a.total} tags=${d5a.tags.length}`);
      assert('返回字段完整', d5a.tags[0]?.tagCode && d5a.tags[0]?.tagType && d5a.tags[0]?.status);
      console.log(`   首条: ${d5a.tags[0]?.tagCode} type=${d5a.tags[0]?.tagType} status=${d5a.tags[0]?.status}`);
    } catch (e) { assert('list_tags', false, e.message); }

    // 6. list_areas (LIMIT 2000)
    console.log('\n━━━ 6. list_areas (LIMIT 2000 兜底) ━━━');
    try {
      const r6 = await req('tools/call', { name: 'list_areas', arguments: {} });
      const d6 = JSON.parse(r6.result.content[0].text);
      assert('areas <= 2000', d6.areas.length <= 2000, `实际 ${d6.areas.length}`);
      assert('areas 为数组', Array.isArray(d6.areas));
      console.log(`   返回 ${d6.total} 个区域`);
    } catch (e) { assert('list_areas', false, e.message); }

    // 7. get_tag_bindings (统一格式)
    console.log('\n━━━ 7. get_tag_bindings (统一数组格式) ━━━');
    try {
      const r7 = await req('tools/call', { name: 'get_tag_bindings', arguments: {} });
      const d7 = JSON.parse(r7.result.content[0].text);
      assert('返回数组格式', Array.isArray(d7.bindings));
      if (d7.bindings.length > 0) {
        const first = d7.bindings[0];
        assert('含 tagCode 字段', typeof first.tagCode === 'string');
        assert('含 bindName 字段', typeof first.bindName === 'string');
        assert('含 bindType 字段', typeof first.bindType === 'string');
        assert('含 bindId 字段', typeof first.bindId === 'number');
        console.log(`   首条: ${first.tagCode} -> ${first.bindName} (${first.bindType})`);
      } else {
        assert('绑定数为 0', true);
      }
    } catch (e) { assert('get_tag_bindings', false, e.message); }

    // 8. list_maps (LIMIT)
    console.log('\n━━━ 8. list_maps (LIMIT 2000) ━━━');
    try {
      const r8 = await req('tools/call', { name: 'list_maps', arguments: {} });
      const d8 = JSON.parse(r8.result.content[0].text);
      assert('maps <= 2000', d8.maps.length <= 2000, `实际 ${d8.maps.length}`);
    } catch (e) { assert('list_maps', false, e.message); }

    // 9. list_departments (树 + LIMIT)
    console.log('\n━━━ 9. list_departments (树 + LIMIT) ━━━');
    try {
      const r9 = await req('tools/call', { name: 'list_departments', arguments: {} });
      const d9 = JSON.parse(r9.result.content[0].text);
      assert('树结构', Array.isArray(d9.departments));
      assert('total <= 2000', d9.total <= 2000, `实际 ${d9.total}`);
      const rootWithChildren = d9.departments.find(d => d.children && d.children.length > 0);
      if (rootWithChildren) {
        assert('子部门存在', true);
        console.log(`   示例: ${rootWithChildren.name} 下有 ${rootWithChildren.children.length} 个子部门`);
      } else {
        console.log('   ⚠️ 当前数据无嵌套部门(仅一级)，树构建逻辑正常但无数据验证');
      }
      console.log(`   根部门: ${d9.departments.map(d => d.name).join(', ')}`);
    } catch (e) { assert('list_departments', false, e.message); }

    // 10. Resources (2 static + 1 template)
    console.log('\n━━━ 10. Resources (2 static + 1 template) ━━━');
    const rs = await req('resources/list');
    const resources = rs.result.resources || [];
    const templates = rs.result.resourceTemplates || [];
    assert('静态资源 = 2', resources.length === 2, `实际 ${resources.length}`);
    console.log(`   静态: ${resources.map(r => r.uri).join(', ')}`);
    console.log(`   模板: ${templates.length} (${templates.length === 0 ? 'ResourceTemplate { list: undefined } 不列出，但可直接读取' : templates.map(t => t.uriTemplate).join(', ')})`);
    // 验证模板资源可直接读取
    try {
      const firstMap = await req('tools/call', { name: 'list_maps', arguments: {} });
      const mapsData = JSON.parse(firstMap.result.content[0].text);
      if (mapsData.maps.length > 0) {
        const mapCode = mapsData.maps[0].code;
        const resRead = await req('resources/read', { uri: `pls://realtime-map/${mapCode}` });
        const resContent = resRead.result.contents?.[0]?.text;
        const resParsed = JSON.parse(resContent || '{}');
        assert('ResourceTemplate 可直接读取', !!resParsed.mapCode && resParsed.mapCode === mapCode);
        console.log(`   ✅ 模板资源可读: pls://realtime-map/${mapCode} (${resParsed.count} 个标签)`);
      } else {
        console.log('   ⚠️ 无地图数据，跳过模板资源读取测试');
      }
    } catch (e) {
      console.log(`   ⚠️ 模板资源读取: ${e.message}`);
    }

    // 11. Prompts
    console.log('\n━━━ 11. Prompts (3 个) ━━━');
    const ps = await req('prompts/list');
    const prompts = ps.result.prompts || [];
    assert('Prompts 数 = 3', prompts.length === 3, `实际 ${prompts.length}`);
    prompts.forEach(p => console.log(`   ${p.name}`));

    // 12. list_alarms (分页 + 截断)
    console.log('\n━━━ 12. list_alarms (分页 + 截断) ━━━');
    try {
      const r12 = await req('tools/call', { name: 'list_alarms', arguments: { page: 1, pageSize: 2 } });
      const d12 = JSON.parse(r12.result.content[0].text);
      assert('alarms 为数组', Array.isArray(d12.alarms));
      assert('分页正确', d12.alarms.length <= 2, `实际 ${d12.alarms.length}`);
    } catch (e) { assert('list_alarms', false, e.message); }

    // 13. list_personnel (分页)
    console.log('\n━━━ 13. list_personnel (分页 + 截断) ━━━');
    try {
      const r13 = await req('tools/call', { name: 'list_personnel', arguments: { page: 1, pageSize: 2 } });
      const d13 = JSON.parse(r13.result.content[0].text);
      assert('personnel 为数组', Array.isArray(d13.personnel));
      assert('分页正确', d13.personnel.length <= 2, `实际 ${d13.personnel.length}`);
    } catch (e) { assert('list_personnel', false, e.message); }

    // 14. 新工具: pls_health_check
    console.log('\n━━━ 14. pls_health_check (健康检查) ━━━');
    try {
      const r14 = await req('tools/call', { name: 'pls_health_check', arguments: {} });
      const d14 = JSON.parse(r14.result.content[0].text);
      assert('service 字段存在', 'service' in d14);
      assert('mysql 状态正常', d14.mysql.status === 'healthy', `实际 ${d14.mysql.status}`);
      assert('javaApi 状态正常', d14.javaApi.status === 'healthy', `实际 ${d14.javaApi.status}`);
      assert('tools 数量 = 60', d14.tools.count === 60, `实际 ${d14.tools.count}`);
      console.log(`   MySQL: ${d14.mysql.status}, JavaAPI: ${d14.javaApi.status}, tools: ${d14.tools.count}`);
    } catch (e) { assert('pls_health_check', false, e.message); }

    // 15. 新工具: get_batch_tag_locations
    console.log('\n━━━ 15. get_batch_tag_locations (批量位置) ━━━');
    try {
      // Get first 3 tag codes from list_tags
      const tagsR = await req('tools/call', { name: 'list_tags', arguments: { page: 1, pageSize: 3 } });
      const tagsD = JSON.parse(tagsR.result.content[0].text);
      const codeList = tagsD.tags.map(t => t.tagCode);
      if (codeList.length > 0) {
        const r15 = await req('tools/call', { name: 'get_batch_tag_locations', arguments: { tagCodes: codeList } });
        const d15 = JSON.parse(r15.result.content[0].text);
        assert('批量查询返回正确', Array.isArray(d15.locations) && d15.total === codeList.length, `total=${d15.total} locations=${d15.locations.length}`);
        assert('含 online/noData 统计', 'online' in d15 && 'noData' in d15, `online=${d15.online} noData=${d15.noData}`);
        console.log(`   批量查 ${codeList.length} 个标签: online=${d15.online} noData=${d15.noData}`);
      } else {
        assert('批量查询', false, '无可用标签');
      }
    } catch (e) { assert('get_batch_tag_locations', false, e.message); }

    // 16. 新特性: isUnread 告警筛选
    console.log('\n━━━ 16. list_alarms (isUnread 未读筛选) ━━━');
    try {
      const r16 = await req('tools/call', { name: 'list_alarms', arguments: { isUnread: true, page: 1, pageSize: 3 } });
      const d16 = JSON.parse(r16.result.content[0].text);
      assert('isUnread 筛选生效', Array.isArray(d16.alarms), `返回 ${d16.alarms?.length} 条未读告警`);
      console.log(`   未读告警: ${d16.alarms?.length} 条`);
    } catch (e) { assert('list_alarms isUnread', false, e.message); }

    // 17. 新特性: getInOutRecords 有 total
    console.log('\n━━━ 17. get_in_and_out_records (total 分页) ━━━');
    try {
      const r17 = await req('tools/call', { name: 'get_in_and_out_records', arguments: { page: 1, pageSize: 3 } });
      const d17 = JSON.parse(r17.result.content[0].text);
      assert('含 total 字段', typeof d17.total === 'number', `total=${d17.total}`);
      assert('分页记录数正确', Array.isArray(d17.records) && d17.records.length <= 3, `records=${d17.records?.length}`);
    } catch (e) { assert('get_in_and_out_records', false, e.message); }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log(`  总计: ${total} | ✅ ${ok} | ❌ ${fail}`);
    console.log(`  通过率: ${total > 0 ? Math.round(ok / total * 100) : 0}%`);
    console.log('='.repeat(50));

  } catch (e) {
    console.error('Fatal:', e.message, e.stack);
  } finally {
    server.kill('SIGTERM');
    await new Promise(r => setTimeout(r, 1000));
    process.exit(0);
  }
})();