import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const pool = mysql.createPool({
  host: '192.168.10.221', port: 3306, user: 'root', password: 'root',
  database: 'ishz_pls_six_zhongchechangjiang', charset: 'utf8mb4'
});

(async () => {
  console.log('=== 清理测试数据 ===\n');

  // Fetch columns for each table
  const tables = ['gis_tag', 'personnel_information', 'car', 'goods', 'gis_area', 'gis_anchor', 'gis_alarm_rule', 'gis_building', 'gis_map', 'gis_area_rule'];
  const tableCols: Record<string, string[]> = {};
  for (const t of tables) {
    const [rows] = await pool.execute(`SHOW COLUMNS FROM ${t}`);
    tableCols[t] = (rows as any[]).map((r: any) => r.Field);
  }

  // Test codes per table (matching test payloads)
  const testCodes: Record<string, string[]> = {
    gis_tag: ['T999', 'T888'],
    personnel_information: ['P999'],
    car: ['C999'],
    goods: ['G999'],
    gis_area: ['A999'],
    gis_anchor: ['AC999'],
    gis_alarm_rule: [],
    gis_building: [],
    gis_map: [],
    gis_area_rule: [],
  };

  // Name-based cleanup for tables that have a name column
  const testNames: Record<string, string[]> = {
    gis_tag: [],
    personnel_information: ['测试人员'],
    car: [],
    goods: ['测试物资'],
    gis_area: ['测试区域'],
    gis_anchor: [],
    gis_alarm_rule: ['测试报警规则'],
    gis_building: ['测试楼'],
    gis_map: ['测试地图'],
    gis_area_rule: ['测试区域规则'],
  };

  // Code column per table
  const codeCol: Record<string, string> = {
    gis_tag: 'tag_code',
    personnel_information: 'code',
    car: 'car_code',
    goods: 'code',
    gis_area: 'area_code',
    gis_anchor: 'code',
    gis_alarm_rule: 'code',
    gis_building: 'code',
    gis_map: 'code',
    gis_area_rule: 'code',
  };

  let total = 0;

  for (const table of tables) {
    const cols = tableCols[table];
    const col = codeCol[table];

    // Delete by test codes
    for (const code of testCodes[table]) {
      const [r] = await pool.execute(`DELETE FROM ${table} WHERE ${col} = ?`, [code]);
      const affected = (r as any).affectedRows || 0;
      if (affected > 0) { console.log(`  🗑️ ${table} (${col}='${code}'): ${affected} 条`); total += affected; }
    }

    // Delete by test names (only if table has name column)
    if (cols.includes('name')) {
      for (const name of testNames[table]) {
        const [r] = await pool.execute(`DELETE FROM ${table} WHERE name = ?`, [name]);
        const affected = (r as any).affectedRows || 0;
        if (affected > 0) { console.log(`  🗑️ ${table} (name='${name}'): ${affected} 条`); total += affected; }
      }
    }
  }

  console.log(`\n✅ 清理完成: 共删除 ${total} 条`);
  await pool.end();
})().catch(e => { console.error(e); pool.end(); });