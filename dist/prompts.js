import { z } from 'zod';
import { query } from './db/connection.js';
import { callSystemStats } from './api/client.js';
import { log } from './config/settings.js';
export function registerPrompts(server) {
    // 1. Alarm analysis prompt
    server.registerPrompt('pls_analyze_alarm', {
        title: 'PLS Analyze Alarm',
        description: '分析告警事件，结合实时位置和绑定关系给出告警上下文和处置建议',
        argsSchema: {
            tagCode: z.string().optional().describe('标签编码，不传则分析最近告警'),
            alarmId: z.number().optional().describe('告警ID，精确查询'),
        },
    }, async (args) => {
        const contextParts = [
            '# 告警分析助手\n',
            '你是 PLS 定位系统的告警分析助手。请基于以下数据对告警事件进行分析：\n',
        ];
        try {
            if (args.alarmId) {
                const alarms = await query(`SELECT tag_code, alarm_type, area_id, area_name, alarm_time, content
             FROM log_alarm WHERE id = ? LIMIT 1`, [args.alarmId]);
                if (alarms.length) {
                    contextParts.push('## 告警详情');
                    contextParts.push(JSON.stringify(alarms[0], null, 2));
                }
            }
            if (args.tagCode) {
                const recentAlarms = await query(`SELECT tag_code, alarm_type, area_name, alarm_time
             FROM log_alarm WHERE tag_code = ? ORDER BY alarm_time DESC LIMIT 5`, [args.tagCode]);
                if (recentAlarms.length) {
                    contextParts.push('\n## 该标签近期告警');
                    contextParts.push(JSON.stringify(recentAlarms, null, 2));
                }
            }
            const stats = await callSystemStats();
            contextParts.push('\n## 系统状态');
            contextParts.push(JSON.stringify(stats, null, 2));
        }
        catch (err) {
            contextParts.push(`\n(部分数据获取失败: ${err.message})`);
        }
        contextParts.push('\n---\n请分析以上告警信息，包括：');
        contextParts.push('1. 告警类型和严重程度');
        contextParts.push('2. 关联的标签和人员');
        contextParts.push('3. 可能的原因分析');
        contextParts.push('4. 处置建议');
        return {
            messages: [{ role: 'user', content: { type: 'text', text: contextParts.join('\n') } }],
        };
    });
    // 2. Personnel report prompt
    server.registerPrompt('pls_personnel_report', {
        title: 'PLS Personnel Report',
        description: '生成人员在场/离岗报告，结合进出记录和实时位置',
        argsSchema: {
            departmentId: z.number().optional().describe('部门ID，不传则全公司'),
            date: z.string().optional().describe('日期，格式 YYYY-MM-DD，默认今天'),
        },
    }, async (args) => {
        const contextParts = [
            '# 人员在场报告\n',
            '你是 PLS 定位系统的管理助手。请基于以下数据生成人员在场/离岗报告：\n',
        ];
        try {
            const dateFilter = args.date || new Date().toISOString().slice(0, 10);
            let deptCondition = '';
            const deptParams = [];
            if (args.departmentId) {
                deptCondition = ' AND department_id = ?';
                deptParams.push(args.departmentId);
            }
            const personnel = await query(`SELECT id, name, department_id, tag_code
           FROM personnel_information WHERE 1=1${deptCondition}`, deptParams);
            contextParts.push(`## 人员列表（共 ${personnel.length} 人）`);
            contextParts.push(JSON.stringify(personnel, null, 2));
            const inArea = await query(`SELECT l.tag_code, l.area_id, l.area_name, l.in_date_time
           FROM logs_area_in_and_out l WHERE DATE(l.in_date_time) = ? AND l.out_date_time IS NULL`, [dateFilter]);
            contextParts.push(`\n## 当前在场记录（${inArea.length} 条）`);
            contextParts.push(JSON.stringify(inArea, null, 2));
        }
        catch (err) {
            contextParts.push(`\n(部分数据获取失败: ${err.message})`);
        }
        contextParts.push('\n---\n请生成报告，包括：');
        contextParts.push('1. 总人数和在场人数');
        contextParts.push('2. 各区域分布');
        contextParts.push('3. 离岗/缺勤人员');
        contextParts.push('4. 异常情况提示');
        return {
            messages: [{ role: 'user', content: { type: 'text', text: contextParts.join('\n') } }],
        };
    });
    // 3. Area safety prompt
    server.registerPrompt('pls_area_safety', {
        title: 'PLS Area Safety',
        description: '评估区域安全状况，结合告警记录、人员进出和区域规则',
        argsSchema: {
            areaId: z.number().optional().describe('区域ID，不传则评估所有区域'),
        },
    }, async (args) => {
        const contextParts = [
            '# 区域安全评估\n',
            '你是 PLS 定位系统的安全评估助手。请基于以下数据评估区域安全状况：\n',
        ];
        try {
            let areaCondition = '';
            const areaParams = [];
            if (args.areaId) {
                areaCondition = ' WHERE id = ?';
                areaParams.push(args.areaId);
            }
            const areas = await query(`SELECT id, name, map_id, area_type FROM gis_area${areaCondition}`, areaParams);
            contextParts.push(`## 区域列表（共 ${areas.length} 个区域）`);
            contextParts.push(JSON.stringify(areas, null, 2));
            const alarmStats = await query(`SELECT area_id, area_name, COUNT(*) as alarm_count
           FROM log_alarm WHERE alarm_time > DATE_SUB(NOW(), INTERVAL 24 HOUR) GROUP BY area_id`);
            contextParts.push('\n## 24小时内各区域告警统计');
            contextParts.push(JSON.stringify(alarmStats, null, 2));
            const inOutStats = await query(`SELECT area_id, area_name, COUNT(*) as person_count
           FROM logs_area_in_and_out WHERE out_date_time IS NULL GROUP BY area_id`);
            contextParts.push('\n## 各区域当前人员数');
            contextParts.push(JSON.stringify(inOutStats, null, 2));
        }
        catch (err) {
            contextParts.push(`\n(部分数据获取失败: ${err.message})`);
        }
        contextParts.push('\n---\n请评估：');
        contextParts.push('1. 各区域安全等级（高/中/低风险）');
        contextParts.push('2. 告警频次和类型分布');
        contextParts.push('3. 人员密度是否合理');
        contextParts.push('4. 关注/改进建议');
        return {
            messages: [{ role: 'user', content: { type: 'text', text: contextParts.join('\n') } }],
        };
    });
    log('3 prompts registered');
}
//# sourceMappingURL=prompts.js.map