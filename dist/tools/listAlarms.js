import { server, z } from '../server.js';
import { query } from '../db/connection.js';
import { log } from '../config/settings.js';
import { READ_ONLY_ANNOTATIONS } from '../constants.js';
server.registerTool('list_alarms', {
    title: 'list_alarms',
    description: `查询告警记录，可按标签、告警类型、时间范围筛选。返回告警时间、类型、关联人员等信息。

参数:
  - tagCode: 标签编码（可选）
  - alarmType: 告警类型（可选），如"超时"、"越界"、"低电量"
  - timeRange: 时间范围（可选），单日"2026-07-09"或范围"2026-07-01,2026-07-09"
  - pageSize: 每页数量
  - page: 页码

返回: 告警记录列表，含类型、时间、区域、内容

错误处理:
  - 无告警时返回空列表
  - 使用分页和时间范围控制数据量`,
    annotations: READ_ONLY_ANNOTATIONS,
    inputSchema: z.object({
        tagCode: z.string().optional().describe('标签编码，如 UWB001'),
        alarmType: z.string().optional().describe('告警类型，如 "超时", "越界", "低电量"'),
        timeRange: z.string().optional().describe('时间范围，格式 "YYYY-MM-DD"，如 "2026-07-09"'),
        pageSize: z.number().min(1).max(500).default(50).describe('每页数量，默认50，最大500'),
        page: z.number().min(1).default(1).describe('页码，默认1'),
    }).strict(),
}, async (args) => {
    try {
        const ALARM_TYPE_MAP = { '入侵': 0, '越界': 1, '超限': 2, '低位': 3, '超时': 4, '低电': 5, '超速': 6 };
        const { tagCode, alarmType, timeRange, pageSize, page } = args;
        let sql = `SELECT id, tag_code, alarm_type, area_id, area_name, alarm_time, already_read, alarm_details FROM log_alarm WHERE 1=1`;
        const params = [];
        if (tagCode !== undefined) {
            sql += ' AND tag_code = ?';
            params.push(tagCode);
        }
        if (alarmType !== undefined) {
            sql += ' AND alarm_type = ?';
            params.push(ALARM_TYPE_MAP[alarmType] ?? alarmType);
        }
        if (timeRange !== undefined) {
            if (timeRange.includes(',')) {
                const [start, end] = timeRange.split(',');
                sql += ' AND alarm_time >= ? AND alarm_time < DATE_ADD(?, INTERVAL 1 DAY)';
                params.push(start.trim(), end.trim());
            }
            else {
                sql += ' AND alarm_time >= ? AND alarm_time < DATE_ADD(?, INTERVAL 1 DAY)';
                params.push(timeRange.trim(), timeRange.trim());
            }
        }
        sql += ' ORDER BY alarm_time DESC LIMIT ? OFFSET ?';
        params.push(pageSize, (page - 1) * pageSize);
        const alarms = await query(sql, params);
        return { content: [{ type: 'text', text: JSON.stringify({ page, pageSize, alarms: alarms.map(a => ({
                            id: a.id, tagCode: a.tag_code, alarmType: a.alarm_type, areaId: a.area_id,
                            areaName: a.area_name || '', alarmTime: a.alarm_time, isRead: a.already_read, content: a.alarm_details,
                        })), }, null, 2) }] };
    }
    catch (err) {
        log('Error in list_alarms:', err.message);
        return { content: [{ type: 'text', text: `Error: 查询告警记录失败 - ${err.message}。建议：缩小时间范围或检查筛选条件。` }], isError: true };
    }
});
//# sourceMappingURL=listAlarms.js.map