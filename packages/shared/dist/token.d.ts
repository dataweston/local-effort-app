export type TokenPayload = {
    oid: string;
    n: string;
    q: number;
    e: string;
    v: string;
    t: "sando";
    jti: string;
};
export declare const makeHumanCode: () => string;
export declare function signToken(payload: TokenPayload, kid: string, privRaw: Uint8Array): Promise<string>;
export declare function verifyToken(token: string, pubRaw: Uint8Array): Promise<{
    ok: false;
    header?: undefined;
    payload?: undefined;
} | {
    ok: true;
    header: {
        alg: string;
        kid: string;
    };
    payload: TokenPayload;
}>;
