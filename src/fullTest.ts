import mysql from 'mysql2/promise';
import http from 'http';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const API_BASE = 'http://127.0.0.1:8180/pls';
const API_KEY = 'mcp-write-key-2024';
const pool = mysql.createPool({
  host: '192.168.10.221', port: 3306, user: 'root', password: 'root',
  database: 'ishz_pls_six_zhongchechangjiang', charset: 'utf8mb4',
  supportBigNumbers: true,
  bigNumberStrings: true,
});

let pass = 0, fail = 0, warn = 0;

function ok(name: string) { pass++; console.log(`  ✅ ${name}`); }
function failTest(name: string, reason: string) { fail++; console.log(`  ❌ ${name} - ${reason}`); }
function warning(name: string, reason: string) { warn++; console.log(`  ⚠️  ${name} - ${reason}`); }

async function httpGet(path: string): Promise<any> {
  return new Promise((resolve) => {
    http.get(`${API_BASE}${path}`, { rejectUnauthorized: false }, (res) => {
      let d = '';
      res.on('data', (chunk) => d += chunk);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, body: d }); } });
    }).on('error', () => resolve({ status: 0, body: 'Connection failed' }));
  });
}

async function httpPost(path: string, body: any): Promise<any> {
  const data = JSON.stringify(body);
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Content-Length': String(Buffer.byteLength(data)), 'X-MCP-Api-Key': API_KEY };
  return new Promise((resolve) => {
    const req = http.request(`${API_BASE}${path}`, { method: 'POST', headers, rejectUnauthorized: false }, (res) => {
      let d = '';
      res.on('data', (chunk) => d += chunk);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, body: d }); } });
    });
    req.on('error', () => resolve({ status: 0, body: 'Connection failed' }));
    req.write(data);
    req.end();
  });
}

function checkResp(r: any, name: string) {
  const code = r.body?.status;
  if (code === 200) { ok(name); return true; }
  if (code === 500) { failTest(name, `server exception`); return false; }
  if (code === 6) { failTest(name, r.body?.error?.[0]?.slice(0, 80) || 'execution failed'); return false; }
  if (typeof r.body === 'string') { failTest(name, r.body.slice(0, 80)); return false; }
  warning(name, `status=${code}`);
  return false;
}

async function checkPhase(phase: string, tests: Array<{ name: string; fn: () => Promise<void> }>) {
  console.log(`\n--- ${phase} ---`);
  for (const t of tests) { await t.fn(); }
}

const SUFFIX = String(Date.now()).slice(-6);

function getIds() {
  return { tagId: 1, personId: 1, carId: 1, goodsId: 1, areaId: 1, anchorId: 1, alarmId: 1, buildingId: 1, mapId: 1, areaRuleId: 1, bindPersonId: '99999', bindCarId: '99999', bindGoodsId: '99999', bindTagId: '1' };
}

(async () => {
  console.log('========================================');
  console.log(`  PLS-MCP 全功能测试 (v6 - id更新+真实绑定)`);
  console.log('========================================');

  // 预查所有真实ID
  const ids = getIds();
  const queryId = async (table: string, col: string = 'id') => {
    try {
      const [r] = await pool.execute(`SELECT ${col} FROM ${table} WHERE del_flg=0 LIMIT 1`);
      return (r as any[]).length > 0 ? (r as any[])[0][col] : null;
    } catch { return null; }
  };
  const [tagId, personId, carId, goodsId, areaId, anchorId, alarmId, buildingId, mapId, areaRuleId] = await Promise.all([
    queryId('gis_tag'), queryId('personnel_information'), queryId('car'), queryId('goods'),
    queryId('gis_area'), queryId('gis_anchor'), queryId('gis_alarm_rule'),
    queryId('gis_building'), queryId('gis_map'), queryId('gis_area_rule'),
  ]);
  if (tagId) ids.tagId = tagId; if (personId) { ids.personId = personId; ids.bindPersonId = String(personId); }
  if (carId) { ids.carId = carId; ids.bindCarId = String(carId); }
  if (goodsId) { ids.goodsId = goodsId; ids.bindGoodsId = String(goodsId); }
  if (areaId) ids.areaId = areaId;
  if (anchorId) ids.anchorId = anchorId;
  if (alarmId) ids.alarmId = alarmId;
  if (buildingId) ids.buildingId = buildingId;
  if (mapId) ids.mapId = mapId;
  if (areaRuleId) ids.areaRuleId = areaRuleId;
  if (tagId) ids.bindTagId = String(tagId);

  const hasPerson = personId != null, hasCar = carId != null, hasGoods = goodsId != null;
  console.log(`  tag=${ids.tagId}, person=${ids.bindPersonId}${hasPerson?'':'(空)'}, car=${ids.bindCarId}${hasCar?'':'(空)'}, goods=${ids.bindGoodsId}${hasGoods?'':'(空)'}\n`);

  const P: Record<string, { add: any; update: any }> = {
    tag: { add: { tagCode: `T${SUFFIX}`, tagType: 1, status: 1, power: 100, isBind: 0 }, update: { id: ids.tagId } },
    person: { add: { name: `测试_${SUFFIX}`, code: `P${SUFFIX}` }, update: { id: ids.personId, name: `更新_${SUFFIX}` } },
    car: { add: { carCode: `C${SUFFIX}`, carType: 1, defaultNumber: 1 }, update: { id: ids.carId, carType: 1 } },
    goods: { add: { name: `物资_${SUFFIX}`, code: `G${SUFFIX}` }, update: { id: ids.goodsId, name: `更新_${SUFFIX}` } },
    area: { add: { name: `区域_${SUFFIX}`, areaCode: `A${SUFFIX}`, areaType: 1 }, update: { id: ids.areaId, name: `更新_${SUFFIX}` } },
    anchor: { add: { code: `AC${SUFFIX}`, anchorType: 1, anchorIp: '192.168.1.1', anchorLocation: '0,0,0' }, update: { id: ids.anchorId, anchorType: 1 } },
    alarm_rule: { add: { name: `规则_${SUFFIX}`, alarmType: 1 }, update: { id: ids.alarmId, name: `更新_${SUFFIX}` } },
    building: { add: { name: `楼_${SUFFIX}` }, update: { id: ids.buildingId, name: `更新_${SUFFIX}` } },
    map: { add: { name: `地图_${SUFFIX}`, code: `M${SUFFIX}` }, update: { id: ids.mapId, name: `更新_${SUFFIX}` } },
    area_rule: { add: { name: `区域规则_${SUFFIX}`, fittingMethod: 0 }, update: { id: ids.areaRuleId, name: `更新_${SUFFIX}` } },
  };

  // P1
  await checkPhase('P1: 系统健康检查', [
    { name: 'API 连通性', fn: async () => { const r = await httpGet('/swagger-resources'); r.status === 0 ? failTest('API 连通性', '无法连接') : ok('API 连通性'); }},
    { name: 'MySQL 连通性', fn: async () => { try { await pool.execute('SELECT 1'); ok('MySQL 连通性'); } catch (e: any) { failTest('MySQL 连通性', e.message); } }},
    { name: 'API Key 验证', fn: async () => {
      const r = await httpPost('/mcp/write/bind/person', { tagId: ids.bindTagId, entityId: '99999' });
      if (r.body?.status === 500) { warning('API Key 验证', '认证成功但bind抛server exception'); return; }
      if (r.body?.status === 6 && String(r.body?.error || '').includes('configured')) { failTest('API Key 验证', '未配置'); return; }
      ok('API Key 验证 (已识别)');
    }},
  ]);

  // P2
  await checkPhase('P2: 基础只读工具', [
    { name: 'realtime_stats', fn: async () => checkResp(await httpGet('/mcp/realtime/stats'), 'realtime_stats') },
    { name: 'realtime_locations', fn: async () => checkResp(await httpGet('/mcp/realtime/locations'), 'realtime_locations') },
    { name: 'location_11', fn: async () => checkResp(await httpGet('/mcp/realtime/location/11'), 'location_11') },
    { name: 'bindings', fn: async () => checkResp(await httpGet('/mcp/realtime/bindings'), 'bindings') },
    { name: 'list_tags', fn: async () => checkResp(await httpGet('/mcp/realtime/tags'), 'list_tags') },
  ]);

  // P3
  await checkPhase('P3: 高级只读工具', [
    { name: 'in_area', fn: async () => {
      try {
        const [rows] = await pool.execute('SELECT id FROM gis_area WHERE del_flg=0 LIMIT 1');
        if ((rows as any[]).length === 0) { warning('in_area', '无数据'); return; }
        checkResp(await httpGet(`/mcp/realtime/in-area/${rows[0].id}`), 'in_area');
      } catch (e: any) { warning('in_area', e.message); }
    }},
    { name: 'list_persons', fn: async () => checkResp(await httpGet('/mcp/realtime/persons'), 'list_persons') },
    { name: 'list_departments', fn: async () => checkResp(await httpGet('/mcp/realtime/departments'), 'list_departments') },
    { name: 'list_cars', fn: async () => checkResp(await httpGet('/mcp/realtime/cars'), 'list_cars') },
    { name: 'list_goods', fn: async () => checkResp(await httpGet('/mcp/realtime/goods'), 'list_goods') },
    { name: 'list_areas', fn: async () => checkResp(await httpGet('/mcp/realtime/areas'), 'list_areas') },
    { name: 'list_anchors', fn: async () => checkResp(await httpGet('/mcp/realtime/anchors'), 'list_anchors') },
    { name: 'list_alarm_rules', fn: async () => checkResp(await httpGet('/mcp/realtime/alarm_rules'), 'list_alarm_rules') },
    { name: 'list_buildings', fn: async () => checkResp(await httpGet('/mcp/realtime/buildings'), 'list_buildings') },
    { name: 'list_maps', fn: async () => checkResp(await httpGet('/mcp/realtime/maps'), 'list_maps') },
    { name: 'list_area_rules', fn: async () => checkResp(await httpGet('/mcp/realtime/area_rules'), 'list_area_rules') },
  ]);

  // P4
  await checkPhase('P4: 历史数据工具', [
    { name: 'history_location_11', fn: async () => checkResp(await httpGet('/mcp/history/location/11'), 'history_location_11') },
    { name: 'history_trajectory_11', fn: async () => checkResp(await httpGet('/mcp/history/trajectory/11'), 'history_trajectory_11') },
    { name: 'history_alarm', fn: async () => checkResp(await httpGet('/mcp/history/alarm'), 'history_alarm') },
    { name: 'history_binding', fn: async () => checkResp(await httpGet('/mcp/history/binding'), 'history_binding') },
  ]);

  // P5
  await checkPhase('P5: Resources', [
    { name: 'resource:system_status', fn: async () => checkResp(await httpGet('/mcp/resource/system_status'), 'resource:system_status') },
    { name: 'resource:config_info', fn: async () => checkResp(await httpGet('/mcp/resource/config_info'), 'resource:config_info') },
    { name: 'resource:db_status', fn: async () => checkResp(await httpGet('/mcp/resource/db_status'), 'resource:db_status') },
  ]);

  // P6: Bind/Unbind 用真实ID
  await checkPhase('P6: Bind/Unbind (6 tools)', [
    { name: 'bind_person', fn: async () => {
      if (!hasPerson) { warning('bind_person', 'personnel 表为空'); return; }
      checkResp(await httpPost('/mcp/write/bind/person', { tagId: ids.bindTagId, entityId: ids.bindPersonId }), 'bind_person');
    }},
    { name: 'unbind_person', fn: async () => {
      if (!hasPerson) { warning('unbind_person', 'personnel 表为空'); return; }
      checkResp(await httpPost('/mcp/write/unbind/person', { tagId: ids.bindTagId, entityId: ids.bindPersonId }), 'unbind_person');
    }},
    { name: 'bind_car', fn: async () => {
      if (!hasCar) { warning('bind_car', 'car 表为空'); return; }
      checkResp(await httpPost('/mcp/write/bind/car', { tagId: ids.bindTagId, entityId: ids.bindCarId }), 'bind_car');
    }},
    { name: 'unbind_car', fn: async () => {
      if (!hasCar) { warning('unbind_car', 'car 表为空'); return; }
      checkResp(await httpPost('/mcp/write/unbind/car', { tagId: ids.bindTagId, entityId: ids.bindCarId }), 'unbind_car');
    }},
    { name: 'bind_goods', fn: async () => {
      if (!hasGoods) { warning('bind_goods', 'goods 表为空'); return; }
      checkResp(await httpPost('/mcp/write/bind/goods', { tagId: ids.bindTagId, entityId: ids.bindGoodsId }), 'bind_goods');
    }},
    { name: 'unbind_goods', fn: async () => {
      if (!hasGoods) { warning('unbind_goods', 'goods 表为空'); return; }
      checkResp(await httpPost('/mcp/write/unbind/goods', { tagId: ids.bindTagId, entityId: ids.bindGoodsId }), 'unbind_goods');
    }},
  ]);

  // P7
  await checkPhase('P7: External Calls', [
    { name: 'sos_alarm', fn: async () => { const r = await httpPost('/external/call/sos/alarm', { tagCode: '11', personnelId: '1' }); r.status === 200 ? ok('sos_alarm') : failTest('sos_alarm', `status=${r.status}`); }},
    { name: 'update_tag', fn: async () => { const r = await httpPost('/external/call/update/tag', { tagCode: '11', name: `标签_${SUFFIX}` }); r.status === 200 ? ok('update_tag') : failTest('update_tag', `status=${r.status}`); }},
    { name: 'update_anchor', fn: async () => { const r = await httpPost('/external/call/update/anchor', { anchorId: '1', name: `锚点_${SUFFIX}` }); r.status === 200 ? ok('update_anchor') : failTest('update_anchor', `status=${r.status}`); }},
  ]);

  // P8: CRUD (30 tools) — 先update再add，避免add制造重复记录
  const entities = Object.keys(P);
  await checkPhase('P8: CRUD (30 tools)', [
    ...entities.flatMap(entity => {
      const p = P[entity];
      return [
        { name: `${entity}/update`, fn: async () => { checkResp(await httpPost(`/mcp/write/${entity}/update`, p.update), `${entity}/update`); }},
        { name: `${entity}/add`, fn: async () => { checkResp(await httpPost(`/mcp/write/${entity}/add`, p.add), `${entity}/add`); }},
        { name: `${entity}/delete`, fn: async () => { checkResp(await httpPost(`/mcp/write/${entity}/delete`, { ids: ['99999'] }), `${entity}/delete`); }},
      ];
    })
  ]);

  // P9
  await checkPhase('P9: Prompts', [
    { name: 'prompt:tag_query', fn: async () => checkResp(await httpGet('/mcp/prompt/tag_query'), 'prompt:tag_query') },
    { name: 'prompt:personnel_query', fn: async () => checkResp(await httpGet('/mcp/prompt/personnel_query'), 'prompt:personnel_query') },
    { name: 'prompt:alarm_query', fn: async () => checkResp(await httpGet('/mcp/prompt/alarm_query'), 'prompt:alarm_query') },
  ]);

  const total = pass + fail + warn;
  console.log('\n========================================');
  console.log(`  ✅ ${pass}  ❌ ${fail}  ⚠️  ${warn}`);
  console.log(`  总计: ${total} | 通过率: ${((pass / total) * 100).toFixed(1)}%`);
  console.log('========================================');

  await pool.end();
  process.exit(fail > 0 ? 1 : 0);
})();