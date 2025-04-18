import { AllExtends, JToken, UtilFT, UtilFunc } from "@zwa73/utils";
import { IpcMainInvokeEvent, app } from "electron";
import fs from 'fs';
import { splitAudioByData } from "./Util";

/**桥函数化 */
const bridgeify = <F extends (...args: any[]) => any>(func:F):
    F extends (...args:infer IN)=>infer OUT
        ? AllExtends<IN,JToken> extends true
            ? OUT extends JToken|void|Promise<JToken|void>
                ? (e:IpcMainInvokeEvent,...args:Parameters<F>)=>ReturnType<F>
                : Error&"返回值无法序列化"
            : Error&"传入值无法序列化"
        : never =>
    ((e:IpcMainInvokeEvent,...args:Parameters<F>):ReturnType<F>=>
        (func as any)(...args)) as any;

/**后端桥对象 */
export const BridgeBackend = {
    loadJsonFile :bridgeify(UtilFT.writeJSONFile),
    writeJSONFile:bridgeify(UtilFT.writeJSONFile),
    parseSrt     :bridgeify(UtilFunc.parseSrt),
    createSrt    :bridgeify(UtilFunc.createSrt),
    parseSrtTime :bridgeify(UtilFunc.parseSrtTime),
    formatSrtTime:bridgeify(UtilFunc.formatSrtTime),
    async writeFile(e:IpcMainInvokeEvent,path:string,data:string){
        return fs.promises.writeFile(path,data);
    },
    async readFile(e:IpcMainInvokeEvent,path:string){
        return fs.promises.readFile(path,'utf-8');
    },
    getAppPath() {
        return app.getAppPath();
    },
    test(e: IpcMainInvokeEvent, text: string) {
        return text + 0;
    },
    splitAudioByData:bridgeify(splitAudioByData),
};
export type BridgeBackend = typeof BridgeBackend;

//断言确保桥符合类型
const assertBridge = <
    T extends {
        [key in string|number|symbol]: (arg1: IpcMainInvokeEvent, ...args: any[]) => any;
    } & { getBridgeKeys?: never } >(t:T) => undefined;
assertBridge(BridgeBackend);