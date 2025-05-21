import React, { ReactNode, Ref, createRef, forwardRef, useEffect, useImperativeHandle, useState } from "react";
import styled from "styled-components";
import { WaveformContainer} from "./WaveformContainer";
import { UtilRH, UtilRT } from "@zwa73/react-utils";
import { AudioFileData, SrtFileData } from "./AudioTookKitInterface";
import { getFileData } from "./Util";
import { BridgeProxy } from "Frontend";
import { SavedProjectData } from "@/src/Backend/ProjectData";
import { SrtLineContainer } from "./WaveformContainer/SrtLineContainer";


const Container = styled.div`
    display: block;
    height: calc(100% - 44px);
    width: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    box-sizing: border-box;
`;

export type AudioToolKitFileTable = Record<string,Partial<{
    srt:SrtFileData;
    audio:AudioFileData;
}>>;
export const AudioToolKitFileTable:AudioToolKitFileTable = {};

type WavefromeMap = Record<string,{
    ref?:React.RefObject<WaveformContainer>;
    node?:ReactNode;
}>;

export type AudioToolKit = {
    removeWaveform:(name:string)=>void;
    saveToJson:()=>SavedProjectData;
    getReactData:()=>typeof AudioToolKitData;
    /**获取 filename: WaveformContainer map */
    getWavefromeMap:()=>WavefromeMap;
    /**设置当前选择的srtline */
    setCurrentSrtLine:(srtLine?:SrtLineContainer)=>void;
};

export type AudioToolKitData = {
    /**吸附步长精度 小于0则不启用 */
    stepPrecision: number;
    /**追加时间 */
    additionalTime: number;
    /**行高 */
    lineHeight: number;
    /**peak精度 */
    peakPrecision: number;
    /**选中的srtLine */
    currentSrtLine: SrtLineContainer|undefined;
    /**波形缩放 */
    vScale:number;
    /**静音阈值 (dB)*/
    muteThreshhold: number;
};
const AudioToolKitData:AudioToolKitData = {
    stepPrecision: 0.1,
    additionalTime: 0,
    lineHeight: 128,
    peakPrecision:128,
    currentSrtLine: undefined,
    muteThreshhold: -100,
    vScale:1,
};

const _AudioToolKit = forwardRef((props:{},ref:Ref<AudioToolKit>) => {
    const [waveformeMap, setWaveformeMap] = useState<WavefromeMap>({});

    const reactDatas = UtilRH.useReactiveObject(AudioToolKitData);

    const [newSrts,setNewSrts] = useState<SrtFileData[]>([]);

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();

        const newFiles = Array.from(event.dataTransfer.files);

        void (async ()=>{
            const nbs = ((await Promise.all(newFiles.map(async file => getFileData(file))))
                .filter(v=>v!=undefined) as (SrtFileData | AudioFileData)[])
                .sort((a,b)=>a.name.localeCompare(b.name));

            const srts = nbs.filter( d =>d.type=="Srt") as SrtFileData[];
            const audios = nbs.filter( d =>d.type=="Audio") as AudioFileData[];
            audios.forEach(d =>{
                AudioToolKitFileTable[d.name] ??={};

                const ref = createRef<WaveformContainer>();
                const node = <WaveformContainer
                    audioData={d}
                    ref={ref}
                    key={`${d.name}-${Date.now()}`}
                />;
                waveformeMap[d.name]={ref,node};
                AudioToolKitFileTable[d.name].audio=d;
            });
            srts.forEach( d =>{
                AudioToolKitFileTable[d.name] ??={};
                AudioToolKitFileTable[d.name].srt=d;
            });
            setNewSrts(srts);
        })();
    };

    const handleWheelZoom = (event: React.WheelEvent<HTMLDivElement>) => {
        if (!event.ctrlKey || AudioToolKitData.currentSrtLine==null) return;
        //console.log('handleWheelZoom');
        //console.log('deltaY',event.deltaY);
        //event.preventDefault();

        AudioToolKitData.currentSrtLine.modifyZoom( - Math.sign(event.deltaY)*0.1);
    };

    useEffect(()=>{
        void (async ()=>{
            console.log(await BridgeProxy.test('bridgetest'));
            await Promise.all(newSrts.map(async d =>
                waveformeMap[d.name]?.ref?.current?.loadSrt(d)));
        })();
    },[newSrts]);

    useImperativeHandle(ref,()=>({
        removeWaveform:(name)=>{
            delete AudioToolKitFileTable[name];
            delete waveformeMap[name];
            // 更新状态
            setWaveformeMap({...waveformeMap});
        },
        saveToJson:()=>{
            const out:SavedProjectData = {audio_table:{}};
            Object.entries(waveformeMap)
                .forEach(([k,v])=>out.audio_table[k]=v.ref!.current!.saveToJson());
            return out;
        },
        getReactData:()=>reactDatas,
        getWavefromeMap:()=>waveformeMap,
        setCurrentSrtLine:(srtLine)=>AudioToolKitData.currentSrtLine=srtLine,
    }),[waveformeMap]);


    return (
        <Container onDrop={handleDrop} onDragOver={UtilRT.preventDefaultEvent} onWheel={handleWheelZoom}>
            {Object.values(waveformeMap).map((dat) => dat.node)}
        </Container>
    );
});

export const {AudioToolKitElement,AudioToolKitRef} = (()=>{
    const AudioToolKitRef = createRef<AudioToolKit>();
    const AudioToolKitElement = <_AudioToolKit ref={AudioToolKitRef}/>;
    return { AudioToolKitElement, AudioToolKitRef };
})();
