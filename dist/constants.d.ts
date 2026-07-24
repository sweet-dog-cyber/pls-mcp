export declare const TOOL_CATEGORY: {
    readonly query: "📊 查询";
    readonly manage: "🔧 管理";
    readonly diagnose: "🔍 诊断";
    readonly batch: "⚡ 批量";
};
export type ToolCategory = keyof typeof TOOL_CATEGORY;
export declare const QUERY_ANNOTATIONS: {
    readonly readOnlyHint: true;
    readonly destructiveHint: false;
    readonly idempotentHint: true;
    readonly openWorldHint: false;
    readonly category: ToolCategory;
};
export declare const MANAGE_ANNOTATIONS: {
    readonly readOnlyHint: false;
    readonly destructiveHint: true;
    readonly idempotentHint: false;
    readonly openWorldHint: true;
    readonly category: ToolCategory;
};
export declare const CREATE_ANNOTATIONS: {
    readonly readOnlyHint: false;
    readonly destructiveHint: false;
    readonly idempotentHint: false;
    readonly openWorldHint: true;
    readonly category: ToolCategory;
};
export declare const DIAGNOSE_ANNOTATIONS: {
    readonly readOnlyHint: true;
    readonly destructiveHint: false;
    readonly idempotentHint: true;
    readonly openWorldHint: false;
    readonly category: ToolCategory;
};
export declare const BATCH_ANNOTATIONS: {
    readonly readOnlyHint: true;
    readonly destructiveHint: false;
    readonly idempotentHint: true;
    readonly openWorldHint: false;
    readonly category: ToolCategory;
};
export declare function descPrefix(category: ToolCategory, title: string): string;
export declare function checkConfirm(confirm?: string, action?: string): never | true;
export declare const READ_ONLY_ANNOTATIONS: {
    readonly readOnlyHint: true;
    readonly destructiveHint: false;
    readonly idempotentHint: true;
    readonly openWorldHint: false;
    readonly category: ToolCategory;
};
export declare const DESTRUCTIVE_ANNOTATIONS: {
    readonly readOnlyHint: false;
    readonly destructiveHint: true;
    readonly idempotentHint: false;
    readonly openWorldHint: true;
    readonly category: ToolCategory;
};
export declare const CHARACTER_LIMIT = 25000;
export declare const ALARM_TYPE_MAP: Record<string, number>;
export declare const ALARM_TYPE_NAME_MAP: Record<number, string>;
export declare const TAG_TYPE_MAP: Record<string, number>;
export declare const TAG_TYPE_NAME_MAP: Record<number, string>;
export declare const AREA_TYPE_MAP: Record<number, string>;
export declare const FITTING_METHOD_MAP: Record<number, string>;
export declare const CAR_TYPE_MAP: Record<number, string>;
export declare const GENDER_MAP: Record<number, string>;
//# sourceMappingURL=constants.d.ts.map