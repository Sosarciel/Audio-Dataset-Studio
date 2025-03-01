import type { webUtils } from "electron";
import type { BridgeDefine } from "@";

/**前端桥对象 */
export type BridgeProxy = BridgeDefine;
export const BridgeProxy:BridgeProxy = new Proxy({},{
    get: (target, prop) => async (...args:any) =>
        (await (window as any).bridge)[prop](...args)
}) as any;

/**代理webUtils */
export const WebUtilsProxy:typeof webUtils = (window as any).webUtils;
