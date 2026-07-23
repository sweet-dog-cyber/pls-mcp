export const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

export const DESTRUCTIVE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: true,
} as const;

export const CREATE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
} as const;

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

// ── Fitting method mapping ──
export const FITTING_METHOD_MAP: Record<number, string> = {
  0: '无', 1: '重心', 2: '散点', 3: '环绕', 4: '直线',
};

// ── Car type mapping ──
export const CAR_TYPE_MAP: Record<number, string> = {
  0: '夹包车', 1: '转运车', 2: '正面吊',
};
