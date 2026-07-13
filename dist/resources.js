import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { query } from './db/connection.js';
import { callListTags, callTagBindings } from './api/client.js';
import { log } from './config/settings.js';
export function registerResources(server) {
    // 1. Database schema info
    server.registerResource('pls_schema', 'pls://schema', {
        description: 'PLS 定位系统数据库表结构说明，包含所有核心表的字段信息',
        mimeType: 'application/json',
    }, async (uri) => {
        try {
            const tables = await query(`SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_COMMENT
           FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = (SELECT DATABASE())
           AND TABLE_NAME IN ('gis_tag','gis_area','gis_anchor','gis_map','gis_building',
             'personnel_information','department','car','goods',
             'log_alarm','logs_area_in_and_out','log_behavior_trajectory',
             'gis_alarm_rule','gis_area_rule')
           ORDER BY TABLE_NAME, ORDINAL_POSITION`);
            return {
                contents: [{
                        uri: uri.href,
                        mimeType: 'application/json',
                        text: JSON.stringify(tables, null, 2),
                    }],
            };
        }
        catch (err) {
            log('Error reading schema:', err.message);
            return { contents: [{ uri: uri.href, mimeType: 'text/plain', text: `Schema unavailable: ${err.message}` }] };
        }
    });
    // 2. Real-time map positions (template)
    server.registerResource('pls_realtime_map', new ResourceTemplate('pls://realtime-map/{mapCode}', { list: undefined }), {
        description: '指定地图上所有标签的实时位置快照',
        mimeType: 'application/json',
    }, async (uri, variables) => {
        try {
            const mapCode = String(variables.mapCode ?? '');
            const allLocations = await callListTags();
            const positions = allLocations.filter((p) => p.mapCode === mapCode);
            let bindingsMap = {};
            try {
                const bindData = await callTagBindings();
                if (typeof bindData === 'object' && !Array.isArray(bindData)) {
                    bindingsMap = bindData;
                }
                else if (Array.isArray(bindData)) {
                    bindData.forEach((b) => { bindingsMap[b.tagCode] = b.bindName; });
                }
            }
            catch { }
            const enriched = positions.map((p) => ({
                tagCode: p.tagCode, x: p.x, y: p.y, mapCode: p.mapCode,
                mapName: p.mapName, bindName: bindingsMap[p.tagCode] || '',
                power: p.power, timestamp: p.timestamp,
            }));
            return {
                contents: [{
                        uri: uri.href,
                        mimeType: 'application/json',
                        text: JSON.stringify({ mapCode, count: enriched.length, positions: enriched }, null, 2),
                    }],
            };
        }
        catch (err) {
            log('Error reading realtime-map:', err.message);
            return { contents: [{ uri: uri.href, mimeType: 'text/plain', text: `Error: ${err.message}` }] };
        }
    });
    // 3. Alarm rules
    server.registerResource('pls_alarm_rules', 'pls://alarm-rules', {
        description: '告警规则配置列表，包含所有告警类型和阈值设置',
        mimeType: 'application/json',
    }, async (uri) => {
        try {
            const rows = await query(`SELECT id, name, alarm_type, thresholds, monitored_period
           FROM gis_alarm_rule WHERE del_flg = 0 ORDER BY create_time DESC`);
            const alarmTypeMap = {
                0: '入侵告警', 1: '越界告警', 2: '超限告警',
                3: '低位告警', 4: '超时告警', 5: '低电告警', 6: '超速告警',
            };
            return {
                contents: [{
                        uri: uri.href,
                        mimeType: 'application/json',
                        text: JSON.stringify(rows.map((r) => ({
                            id: r.id, name: r.name, alarmType: r.alarm_type,
                            alarmTypeName: alarmTypeMap[r.alarm_type] || '',
                            thresholds: r.thresholds, monitoredPeriod: r.monitored_period,
                        })), null, 2),
                    }],
            };
        }
        catch (err) {
            log('Error reading alarm-rules:', err.message);
            return { contents: [{ uri: uri.href, mimeType: 'text/plain', text: `Error: ${err.message}` }] };
        }
    });
    log('3 resources registered');
}
//# sourceMappingURL=resources.js.map