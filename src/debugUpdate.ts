import mysql from 'mysql2/promise';
import http from 'http';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const pool = mysql.createPool({
  host: '192.168.10.221', port: 3306, user: 'root', password: 'root',
  database: 'ishz_pls_six_zhongchechangjiang', charset: 'utf8mb4'
});

async function post(path: string, body: any) {
  const data = JSON.stringify(body);
  return new Promise<any>(resolve => {
    const req = http.request(`http://127.0.0.1:8180/pls${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': String(Buffer.byteLength(data)), 'X-MCP-Api-Key': 'mcp-write-key-2024' },
      rejectUnauthorized: false,
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ httpStatus: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ httpStatus: res.statusCode, body: d }); }
      });
    });
    req.on('error', () => resolve({ httpStatus: 0, body: 'conn err' }));
    req.write(data);
    req.end();
  });
}

(async () => {
  // Get real IDs
  const [[t]] = await pool.execute('SELECT id FROM gis_tag WHERE del_flg=0 LIMIT 1');
  const [[m]] = await pool.execute('SELECT id FROM gis_map WHERE del_flg=0 LIMIT 1');
  const tagId = t?.id;
  const mapId = m?.id;

  console.log(`tag id=${tagId}, map id=${mapId}\n`);

  console.log('=== tag/update ===');
  const tagR = await post('/mcp/write/tag/update', { id: tagId });
  console.log(JSON.stringify(tagR, null, 2));
  console.log('body.status =', tagR.body?.status);
  console.log('body.type =', typeof tagR.body?.status);

  console.log('\n=== map/update ===');
  const mapR = await post('/mcp/write/map/update', { id: mapId });
  console.log(JSON.stringify(mapR, null, 2));
  console.log('body.status =', mapR.body?.status);
  console.log('body.type =', typeof mapR.body?.status);

  await pool.end();
})();