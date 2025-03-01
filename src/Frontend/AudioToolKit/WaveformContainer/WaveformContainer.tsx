import React, { ReactNode, Ref, RefObject, createRef, forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { getWaveform, loadWaveform } from "../Util";
import { UtilRH, UtilRT } from "@zwa73/react-utils";
import { SrtLineContainer } from "./SrtLineContainer";
import { AudioFileData, SrtFileData } from "../AudioTookKitInterface";
import { WaveformControlPanel } from "./WaveformControlPanel";
import { SavedAudioData, SavedLineData } from "@/src/Backend/ProjectData";
import { AudioToolKitRef, BridgeProxy } from "Frontend";
import { SrtSegment } from "@zwa73/utils";
import { SliceData } from "@/src/Backend/Util";
import path from 'pathe';

const Box = styled.div`
    width: calc(100% - 10px);
    align-items: center;
    position: relative;
    padding: 0px;
    margin: 5px;
    margin-top: 15px;
    margin-bottom: 15px;
    border: 2px solid saddlebrown;
    border-radius: 8px;
    box-sizing: border-box; /* 让 padding 和 border 计算在元素的总宽度和高度内 */
    background-color: var(--background-color-2);
    overflow-y: auto;

    & > * {
        border-top: 2px solid saddlebrown;
    }
    & > :first-child {
        border-top: 0px;
    }
`;

export type WaveformContainerProps = {
    audioData:AudioFileData;
}


export type WaveformContainerData = {
    audioData:AudioFileData;
    srtData?:SrtFileData;
    duration:number;
};

export type SrtLines = {
    node:ReactNode;
    ref:RefObject<SrtLineContainer>;
}[];


const WaveformBox = styled.div`
    width: calc( 100% );
    align-items: center;
    position: relative;
    box-sizing: border-box; /* 让 padding 和 border 计算在元素的总宽度和高度内 */
    background-color: var(--background-color-3);
`;

export type WaveformContainer = {
    getData:()=>WaveformContainerData;
    loadSrt:(srt:SrtFileData)=>Promise<void>;
    getSrtLines:()=>SrtLines;
    removeSrtLine:(i:number)=>void;
    /**向 [i, x ,i+1] x 位置插入一个srtline */
    addSrtLine:(i:number)=>void;
    saveToJson:()=>SavedAudioData;
    saveSrtFile:()=>Promise<void>;
    split:()=>Promise<void>;
}

export const WaveformContainer= forwardRef((props:WaveformContainerProps,ref:Ref<WaveformContainer>) => {
    const {audioData} = props;
    const containerRef = useRef<HTMLDivElement>(null);
    const [srtLines,setSrtLines] = useState<SrtLines>([]);
    const datas = useRef<WaveformContainerData>({
        audioData,
        duration:1
    });

    //初始化
    useEffect(() => {
        const {region,waveform} = getWaveform(containerRef.current!);
        //void waveform.loadBlob(audioData.blob);
        loadWaveform(waveform,audioData,false)
            .then(v=>datas.current.duration = v)
            .catch(()=>undefined);
        console.log("WaveformContainer useEffect");
        return ()=>{
            waveform.empty();
            region.destroy();
            waveform.destroy();
        };
    }, []);

    const setLine = useCallback((lines:SrtLines)=>{
        lines.forEach((l,i)=>l.ref.current?.setIndex(i));
        setSrtLines([...lines]);
    },[]);

    const localRef = UtilRH.useLocalRef(ref,()=>({
        getData:()=>datas.current,
        loadSrt:async (srt)=>{
            datas.current.srtData = srt;
            const srtContent = srt.text;
            const segments = await BridgeProxy.parseSrt(srtContent);
            // 根据SRT文件分割音频并显示
            const line = segments.map((segment,index) => {
                    const lineref = createRef<SrtLineContainer>();
                    const node = <SrtLineContainer
                        audioData={audioData}
                        srtSegment={segment}
                        ref={lineref}
                        key={Math.random()}
                        segmentsIndex={index}
                        waveformContainer={localRef}
                    />;
                    return { ref: lineref, node };
                }
            );
            setLine(line);
        },
        getSrtLines:()=>srtLines,
        removeSrtLine:(index)=>setLine(srtLines.filter((l,i)=>i!=index)),
        addSrtLine:(index)=>{
            const nextline = index < srtLines.length - 1
                ? srtLines[index+1]
                : undefined;
            const prevline = index >= 0
                ? srtLines[index]
                : undefined;

            const nsegment:SrtSegment = {
                start: prevline ? prevline.ref.current!.getSrtData().end-1000 : 0 ,
                end  : nextline ? nextline.ref.current!.getSrtData().start+1000 : datas.current.duration*1000,
                text : "new",
            };
            const lineref = createRef<SrtLineContainer>();
            const node = <SrtLineContainer
                audioData={audioData}
                srtSegment={nsegment}
                ref={lineref}
                key={Math.random()}
                segmentsIndex={index+1}
                waveformContainer={localRef}
            />;
            srtLines.splice(index+1,0,{node,ref:lineref});
            setLine(srtLines);
        },
        saveToJson:()=>{
            const lines = srtLines.map((l,index)=>{
                const dat = l.ref.current!.getData();
                const srt = l.ref.current!.getSrtData();
                const {start,end,text} = srt;

                const out:SavedLineData = {
                    index:index+1,
                    is_align:dat.isAlign,
                    start,end,text
                };
                return out;
            });

            return {
                path:audioData.path,
                lines
            };
        },
        saveSrtFile:async ()=>{
            const srtdata = datas.current.srtData;
            if(srtdata==null) return;
            const jsonseq = localRef.current.saveToJson();
            const addTime = AudioToolKitRef.current?.getReactData().additionalTime;
            if(addTime!=null && addTime>0)
                jsonseq.lines[jsonseq.lines.length-1].end += addTime*1000;

            const srttext = `${(await BridgeProxy.createSrt(jsonseq.lines)).trim()}\n`;
            await BridgeProxy.writeFile(srtdata.path,srttext);
        },
        split:async()=>{
            const srtdata = datas.current.srtData;
            if(srtdata==null) return;
            const jsonseq = localRef.current.saveToJson();
            const baseAudioPath = datas.current.audioData.path;
            const outDir = path.parse(baseAudioPath).dir;

            //执行音频切分
            await BridgeProxy.splitWavByData(jsonseq.lines.map((seg,index)=>({
                seg,index,inFilePath:baseAudioPath,outDir
            })));
        },
    }),[srtLines]);

    return <Box
        onDrop={UtilRT.preventDefaultEvent}
        onDragOver={UtilRT.preventDefaultEvent}
    >
        <WaveformControlPanel data={datas.current} waveformContainer={localRef} />
        {srtLines.length>0
            ? [srtLines.map(l=>l.node)]
            : <WaveformBox ref={containerRef} />
        }
    </Box>;
});

