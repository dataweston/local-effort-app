export type ActiveKey = {
    kid: string;
    publicKeyB64: string;
    privateKey?: Uint8Array;
};
export declare const ensureActiveKey: () => ActiveKey;
export declare const getActiveKey: () => ActiveKey;
export declare const getKeyByKid: (kid: string) => ActiveKey | undefined;
//# sourceMappingURL=keys.d.ts.map