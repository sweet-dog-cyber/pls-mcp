export declare const READ_ONLY_ANNOTATIONS: {
    readonly readOnlyHint: true;
    readonly destructiveHint: false;
    readonly idempotentHint: true;
    readonly openWorldHint: false;
};
export declare const DESTRUCTIVE_ANNOTATIONS: {
    readonly readOnlyHint: false;
    readonly destructiveHint: true;
    readonly idempotentHint: false;
    readonly openWorldHint: true;
};
export declare const CREATE_ANNOTATIONS: {
    readonly readOnlyHint: false;
    readonly destructiveHint: false;
    readonly idempotentHint: false;
    readonly openWorldHint: true;
};
export declare const CHARACTER_LIMIT = 25000;
export declare const ALARM_TYPE_MAP: Record<string, number>;
export declare const ALARM_TYPE_NAME_MAP: Record<number, string>;
export declare const TAG_TYPE_MAP: Record<string, number>;
export declare const TAG_TYPE_NAME_MAP: Record<number, string>;
export declare const FITTING_METHOD_MAP: Record<number, string>;
export declare const CAR_TYPE_MAP: Record<number, string>;
//# sourceMappingURL=constants.d.ts.map