// ── Tool category constants ──
export const TOOL_CATEGORY = {
  query: '📊 查询',
  manage: '🔧 管理',
  diagnose: '🔍 诊断',
  batch: '⚡ 批量',
} as const;
export type ToolCategory = keyof typeof TOOL_CATEGORY;

// ── Annotations with category ──
export const QUERY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
  category: 'query' as ToolCategory,
} as const;

export const MANAGE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: true,
  category: 'manage' as ToolCategory,
} as const;

export const CREATE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
  category: 'manage' as ToolCategory,
} as const;

export const DIAGNOSE_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
  category: 'diagnose' as ToolCategory,
} as const;

export const BATCH_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
  category: 'batch' as ToolCategory,
} as const;

// ── Description prefix helper ──
export function descPrefix(category: ToolCategory, title: string): string {
  return `【${TOOL_CATEGORY[category]}】${title}`;
}

// ── Confirmation guard helper ──
export function checkConfirm(confirm?: string, action: string = '写操作'): never | true {
  if (confirm !== '确认') {
    throw new Error(`${action}需二次确认，请传 confirm: "确认"`);
  }
  return true;
}

// ── Legacy aliases (backward compat) ──
export const READ_ONLY_ANNOTATIONS = QUERY_ANNOTATIONS;
export const DESTRUCTIVE_ANNOTATIONS = MANAGE_ANNOTATIONS;

export const CHARACTER_LIMIT = 25000;

// ── Alarm type mapping ──
export const ALARM_TYPE_MAP: Record<string, number> = {
  '入侵': 0, '越界': 1, '超限': 2, '低位': 3, '超时': 4, '低电': 5, '超速': 6,
};

export const ALARM_TYPE_NAME_MAP: Record<number, string> = {
  0: '入侵告警', 1: '越界告警', 2: '超限告警',
  3: '低位告警', 4: '超时告警', 5: '低电告警', 6: '超速告警',
};

// ── Tag type mapping ──
export const TAG_TYPE_MAP: Record<string, number> = {
  'UWB': 0, 'Bluetooth': 1, 'GPS': 2, 'UWB+GPS': 3, '惯性导航': 4,
};

export const TAG_TYPE_NAME_MAP: Record<number, string> = {
  0: 'UWB', 1: 'Bluetooth', 2: 'GPS', 3: 'UWB+GPS', 4: '惯性导航',
};

// ── Area type mapping ──
export const AREA_TYPE_MAP: Record<number, string> = {
  0: '普通', 1: '禁区', 2: '安全区', 3: '集合区',
};

// ── Fitting method mapping ──
export const FITTING_METHOD_MAP: Record<number, string> = {
  0: '无', 1: '重心', 2: '散点', 3: '环绕', 4: '直线',
};

// ── Car type mapping ──
export const CAR_TYPE_MAP: Record<number, string> = {
  0: '夹包车', 1: '转运车', 2: '正面吊',
};

// ── Gender mapping ──
export const GENDER_MAP: Record<number, string> = {
  0: '未知', 1: '男', 2: '女',
};