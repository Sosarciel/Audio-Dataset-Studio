import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type { BridgeDefine } from './index';

/**预加载后端桥对象 */
const BridgePreload = new Promise(async (resolve) =>
    resolve(((await ipcRenderer.invoke("getBridgeKeys")) as string[])
        .map((k) => [k, async (...args: any) => await ipcRenderer.invoke(k, ...args)] as const)
        .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {} as any as BridgeDefine)));

//暴露后端桥对象
contextBridge.exposeInMainWorld('bridge', BridgePreload);

//暴露webUtils
contextBridge.exposeInMainWorld('webUtils', webUtils);