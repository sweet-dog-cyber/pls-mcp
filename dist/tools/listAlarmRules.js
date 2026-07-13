import { server, z } from '../server.js';
import { query } from '../db/connection.js';
import { log } from '../config/settings.js';
import { READ_ONLY_ANNOTATIONS } from '../constants.js';
const alarmTypeMap = {
    0: '入侵告警', 1: '越界告警', 2: '超限告警',
    3: '低位告警', 4: '超时告警', 5: '低电告警', 6: '超速告警',
};
server.registerTool('list_alarm_rules', {
    title: 'list_alarm_rules',
    description: `获取告警规则列表，可按告警类型或名称筛选。

参数:
  - alarmType: 告警类型（可选），0-入侵 ~ 6-超速
  - keyword: 规则名称关键词（可选）

返回: 告警规则列表，含名称、类型、阈值、受控时段`,
    annotations: READ_ONLY_ANNOTATIONS,
    inputSchema: z.object({
        alarmType: z.number().min(0).max(6).optional().describe('告警类型: 0-入侵, 1-越界, 2-超限, 3-低位, 4-超时, 5-低电, 6-超速'),
        keyword: z.string().optional().describe('按规则名称模糊搜索'),
    }).strict(),
}, async (args) => {
    try {
        const { alarmType, keyword } = args;
        let sql = `SELECT id, name, alarm_type, thresholds, monitored_period FROM gis_alarm_rule WHERE del_flg = 0`;
        const params = [];
        if (alarmType !== undefined) {
            sql += ' AND alarm_type = ?';
            params.push(alarmType);
        }
        if (keyword !== undefined) {
            sql += " AND name LIKE ?";
            params.push(`%${keyword}%`);
        }
        sql += ' ORDER BY create_time DESC';
        const rules = await query(sql, params);
        return { content: [{ type: 'text', text: JSON.stringify({ total: rules.length, alarmRules: rules.map(r => ({
                            id: r.id, name: r.name, alarmType: r.alarm_type,
                            alarmTypeName: alarmTypeMap[r.alarm_type] || '',
                            thresholds: r.thresholds, monitoredPeriod: r.monitored_period,
                        })), }, null, 2) }] };
    }
    catch (err) {
        log('Error in list_alarm_rules:', err.message);
        return { content: [{ type: 'text', text: `Error: 查询告警规则失败 - ${err.message}` }], isError: true };
    }
});
//# sourceMappingURL=listAlarmRules.js.map