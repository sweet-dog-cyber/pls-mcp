import { z } from 'zod';

// ── Tag Schema ──
export const TagSchema = z.object({
  id: z.string().optional().describe('标签ID（更新/删除时必填，长整型以字符串传入）'),
  tagCode: z.string().optional().describe('标签编码'),
  model: z.string().optional().describe('型号'),
  tagType: z.number().min(0).max(4).optional().describe('类型: 0-UWB, 1-Bluetooth, 2-GPS, 3-UWB+GPS, 4-惯性导航'),
  status: z.number().min(0).max(1).optional().describe('状态: 0-在线, 1-离线'),
  power: z.number().min(0).max(100).optional().describe('电量百分比'),
  isBind: z.number().min(0).max(1).optional().describe('绑定状态: 0-未绑定, 1-已绑定'),
  markerFile: z.string().optional().describe('标记文件路径'),
  slice: z.number().optional().describe('图层'),
}).strict();

// ── Person Schema ──
export const PersonSchema = z.object({
  id: z.string().optional().describe('人员ID（更新/删除时必填，长整型以字符串传入）'),
  name: z.string().min(1).optional().describe('姓名'),
  departmentId: z.number().optional().describe('部门ID'),
  phone: z.string().optional().describe('电话'),
  gender: z.number().min(0).max(1).optional().describe('性别: 0-未知, 1-男, 2-女'),
  status: z.number().min(0).max(1).optional().describe('状态: 0-正常, 1-停用'),
}).strict();

// ── Car Schema ──
export const CarSchema = z.object({
  id: z.string().optional().describe('车辆ID（更新/删除时必填，长整型以字符串传入）'),
  carCode: z.string().optional().describe('车辆编号'),
  carType: z.number().min(0).max(2).optional().describe('车辆类型: 0-夹包车, 1-转运车, 2-正面吊'),
  carBrand: z.string().optional().describe('品牌'),
  carModel: z.string().optional().describe('型号'),
  machineCode: z.string().optional().describe('车牌号/机械编号'),
  hasWeightDevice: z.number().min(0).max(1).optional().describe('是否配备称重设备: 0-无, 1-有'),
}).strict();

// ── Goods Schema ──
export const GoodsSchema = z.object({
  id: z.string().optional().describe('物品ID（更新/删除时必填，长整型以字符串传入）'),
  code: z.string().optional().describe('物品编号'),
  name: z.string().min(1).optional().describe('物品名称'),
}).strict();

// ── Area Schema ──
export const AreaSchema = z.object({
  id: z.string().optional().describe('区域ID（更新/删除时必填，长整型以字符串传入）'),
  name: z.string().min(1).optional().describe('区域名称'),
  mapId: z.number().optional().describe('所属地图ID'),
  areaType: z.number().min(0).max(3).optional().describe('区域类型: 0-普通, 1-禁区, 2-安全区, 3-集合区'),
  areaRuleId: z.number().optional().describe('关联算法规则ID'),
}).strict();

// ── Anchor Schema ──
export const AnchorSchema = z.object({
  id: z.string().optional().describe('基站ID（更新/删除时必填，长整型以字符串传入）'),
  anchorCode: z.string().optional().describe('基站编码'),
  mapId: z.number().optional().describe('所属地图ID'),
  x: z.number().optional().describe('X坐标'),
  y: z.number().optional().describe('Y坐标'),
  status: z.number().min(0).max(1).optional().describe('状态: 0-在线, 1-离线'),
  anchorLocation: z.string().optional().describe('安装位置描述'),
}).strict();

// ── AlarmRule Schema ──
export const AlarmRuleSchema = z.object({
  id: z.string().optional().describe('告警规则ID（更新/删除时必填，长整型以字符串传入）'),
  name: z.string().min(1).optional().describe('规则名称'),
  alarmType: z.number().min(0).max(6).optional().describe('告警类型: 0-入侵, 1-越界, 2-超限, 3-低位, 4-超时, 5-低电, 6-超速'),
  thresholds: z.number().optional().describe('阈值'),
  monitoredPeriod: z.string().optional().describe('受控时段, 如 "08:00-18:00"'),
}).strict();

// ── Building Schema ──
export const BuildingSchema = z.object({
  id: z.string().optional().describe('楼栋ID（更新/删除时必填，长整型以字符串传入）'),
  name: z.string().min(1).optional().describe('楼栋名称'),
  code: z.string().optional().describe('楼栋编码'),
  description: z.string().optional().describe('描述'),
}).strict();

// ── Map Schema ──
export const MapSchema = z.object({
  id: z.string().optional().describe('地图ID（更新/删除时必填，长整型以字符串传入）'),
  code: z.string().optional().describe('地图编码'),
  name: z.string().min(1).optional().describe('地图名称'),
  buildingId: z.number().optional().describe('所属楼栋ID'),
}).strict();

// ── AreaRule Schema ──
export const AreaRuleSchema = z.object({
  id: z.string().optional().describe('区域规则ID（更新/删除时必填，长整型以字符串传入）'),
  name: z.string().min(1).optional().describe('规则名称'),
  inside: z.number().min(0).optional().describe('进入基准点数'),
  outside: z.number().min(0).optional().describe('离开基准点数'),
  fittingMethod: z.number().min(0).max(4).optional().describe('拟合方式: 0-无, 1-重心, 2-散点, 3-环绕, 4-直线'),
  fittingMethodParam: z.string().optional().describe('拟合参数'),
}).strict();

// ── Delete Schema (通用) ──
export const DeleteSchema = z.object({
  ids: z.array(z.string()).min(1).max(100).describe('要删除的实体ID列表（长整型以字符串传入）'),
}).strict();

// ── 实体类型到 Schema 的映射 ──
export const ENTITY_SCHEMA_MAP: Record<string, z.ZodType<any>> = {
  tag: TagSchema,
  person: PersonSchema,
  car: CarSchema,
  goods: GoodsSchema,
  area: AreaSchema,
  anchor: AnchorSchema,
  alarm_rule: AlarmRuleSchema,
  building: BuildingSchema,
  map: MapSchema,
  area_rule: AreaRuleSchema,
};

// ── 实体类型中文映射 ──
export const ENTITY_NAME_MAP: Record<string, string> = {
  tag: '标签',
  person: '人员',
  car: '车辆',
  goods: '物品',
  area: '区域',
  anchor: '基站',
  alarm_rule: '告警规则',
  building: '楼栋',
  map: '地图',
  area_rule: '区域规则',
};