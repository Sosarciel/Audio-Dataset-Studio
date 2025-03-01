import React, { MutableRefObject, ReactNode, Ref, RefObject, createRef, forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { AudioFileData } from "../AudioTookKitInterface";
import { getWaveform, loadWaveform } from "../Util";
import type { Region } from "wavesurfer.js/dist/plugins/regions";
import { WaveformContainer } from "./WaveformContainer";
import styled, { css } from "styled-components";
import { Card, UtilRH } from "@zwa73/react-utils";
import { SrtLineControlPanle } from "./SrtLineControlPanle";
import WaveSurfer from "wavesurfer.js";
import { AudioToolKitRef } from "../AudioToolKit";
import { SrtSegment } from "@zwa73/utils";
import { render } from 'react-dom';
import { createRoot, Root } from "react-dom/client";

export type SrtLineContainerProps = {
    audioData:AudioFileData;
    srtSegment:SrtSegment;
    /**初始索引键 */
    segmentsIndex:number;
    waveformContainer:MutableRefObject<WaveformContainer>;
}

export type SrtLineContainer = {
    getData:()=>SrtLineContainerData;
    updatePanel:()=>void;
    /**重新对焦 */
    refocus:()=>void;
    /**重设索引键 */
    setIndex:(i:number)=>void;
    getSrtData:()=>SrtSegment;
    /**重新对齐 */
    reAlign:()=>void;
    pause:()=>void;
    play:()=>Promise<void>;
    isPlaying:()=>boolean;
    getPanel: () => SrtLineControlPanle | null;
};


export type SrtLineContainerData = {
    duration:number;
    /**是否为对齐状态 */
    isAlign:boolean;
    /**索引键 */
    segmentsIndex:number;
    mainRegion?:Region;
    waveform?:WaveSurfer;
    contentRoot?:Root;
};

/**计算焦点位置数据 */
function recalcSize(el:HTMLDivElement ,data:SrtLineContainerData){
    // 计算 zoom 级别，使 region 区域缩放到窗口大小的 90%
    const containerWidth = el.offsetWidth/data.duration;
    const regionWidth = Math.max(data.mainRegion!.end - data.mainRegion!.start,1);

    return{
        regionWidth,
        zoomLevel   : (data.duration * containerWidth * 0.5) / regionWidth,
    };
}


const cardStyle = css`
    width: calc( 100% );
    box-sizing: border-box;
    position: relative;
    display: flex;
    overflow-x: hidden; /* 隐藏横向溢出 */
    align-items: flex-start;
    background-color: var(--background-color-3);
`;

const WaveformBox = styled.div`
    width: calc( 100% - 4rem - 2px );
    box-sizing: border-box;
`;

export const SrtLineContainer= forwardRef((props:SrtLineContainerProps,ref:Ref<SrtLineContainer>) => {
    const {audioData,srtSegment,waveformContainer} = props;
    const containerRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<SrtLineControlPanle>(null);
    const datas = useRef<SrtLineContainerData>({
        segmentsIndex  : props.segmentsIndex,
        duration       : 1,
        isAlign        : true,
    });

    useEffect(() => {
        const {region,waveform} = getWaveform(containerRef.current!);
        datas.current!.waveform = waveform;

        waveform.on('ready',()=>{
            const cur = datas.current;
            cur.mainRegion = region.addRegion({
                start :srtSegment.start/1000,
                end   :srtSegment.end  /1000,
                resize:true,
                contentEditable:true,
                content:srtSegment.text,
                drag:false,
                color: 'rgba(200, 200, 200, 0.5)'
            });

            datas.current.contentRoot = createRoot(cur.mainRegion.content!);
            const elements = srtSegment.text
                .split("\n")
                .reduce<JSX.Element[]>((acc, str, index) => {
                    console.log(str);
                    acc.push(<React.Fragment key={Math.random()}>{str}</React.Fragment>);
                    if (index < srtSegment.text.split("\n").length - 1)
                        acc.push(<br key={Math.random()} />);
                    return acc;
                }, []);
            datas.current.contentRoot.render(elements);

            cur.mainRegion.on("update-end",()=>{
                //取整吸附
                const reg = cur.mainRegion;
                if(reg==null) return;

                const stepPrecision = AudioToolKitRef.current!.getReactData().stepPrecision;
                if(stepPrecision>0){
                    reg.start = Math.round(reg.start / stepPrecision) * stepPrecision;
                    reg.end   = Math.round(reg.end   / stepPrecision) * stepPrecision;
                }

                //自动贴合首尾
                const locked = cur.isAlign;
                if(cur.segmentsIndex==0 && locked) reg.start = 0;
                if(cur.segmentsIndex == waveformContainer.current.getSrtLines().length - 1 && locked)
                    reg.end = cur.duration;

                //自动调整相邻区域大小
                const srtLines = waveformContainer.current.getSrtLines();

                if(cur.segmentsIndex>0){
                    const preline = srtLines[cur.segmentsIndex-1];
                    preline.ref.current?.reAlign();
                }

                if(cur.segmentsIndex<srtLines.length-1){
                    const nextLine = srtLines[cur.segmentsIndex+1];
                    nextLine.ref.current?.reAlign();
                }

                reg._onUpdate(0);
                panelRef.current?.forceUpdate();
            });

            containerRef.current?.addEventListener("click", (e) => {
                const srtLines = waveformContainer.current.getSrtLines();
                srtLines.forEach((s)=> (s.ref.current?.getData().segmentsIndex == datas.current.segmentsIndex) || s.ref.current?.pause());
            });

            //初始对焦
            if(containerRef.current==undefined) return;
            const {regionWidth,zoomLevel} = recalcSize(containerRef.current,cur);
            waveform.zoom(zoomLevel);
            waveform.setScrollTime(srtSegment.start/1000 - regionWidth/2);
            panelRef.current?.forceUpdate();
        });
        loadWaveform(waveform,audioData)
            .then(v=>datas.current.duration = v)
            .catch(()=>undefined);

        //窗口变动对焦
        const handleResize = () => {
            const cur = datas.current;
            if(containerRef.current==undefined) return;
            const {regionWidth,zoomLevel} = recalcSize(containerRef.current,cur);
            waveform.zoom(zoomLevel);
            waveform.setScrollTime(
                ((cur.mainRegion?.start)??(srtSegment.start/1000)) - regionWidth/2
            );
        };
        // 添加窗口大小变动事件监听器
        window.addEventListener('resize', handleResize);


        console.log("SrtBoxContainer useEffect");

        // 清理事件监听器
        return () => {
            window.removeEventListener('resize', handleResize);
            waveform.empty();
            region.destroy();
            waveform.destroy();
        };
    }, []);


    const localRef = UtilRH.useLocalRef<SrtLineContainer>(ref,()=>({
        getData:()=>datas.current!,
        updatePanel:()=>panelRef.current?.forceUpdate(),
        refocus:()=>{
            const cur = datas.current;
            if(containerRef.current==undefined) return;
            const {regionWidth,zoomLevel} = recalcSize(containerRef.current,cur);
            cur.waveform?.zoom(zoomLevel);
            cur.waveform?.setScrollTime(datas.current.mainRegion!.start - regionWidth/2);
        },
        setIndex:(i)=>datas.current.segmentsIndex = i,
        getSrtData:()=>{
            const reg = datas.current.mainRegion!;
            let result = "";
            reg.content?.childNodes.forEach(node => {
                if (node.nodeType === Node.TEXT_NODE)
                    result += node.textContent;
                if (node.nodeName === "BR")
                    result += "\n";
            });
            return {
                end  :reg.end  *1000,
                start:reg.start*1000,
                text :result.replace(/\r\n/g,"\n"),
            };
        },
        reAlign:()=>{
            const cur = datas.current;
            if(cur.mainRegion==null) return;

            const srtLines = waveformContainer.current.getSrtLines();
            const preend = srtLines[cur.segmentsIndex-1]?.ref.current?.getData().mainRegion?.end ?? 0;
            const nextstart = srtLines[cur.segmentsIndex+1]?.ref.current?.getData().mainRegion?.start ?? waveformContainer.current.getData().duration;

            //如果未对齐则只控制超出部分
            if(!cur.isAlign){
                if(cur.mainRegion.start < preend) cur.mainRegion.start = preend;
                if(cur.mainRegion.end > nextstart) cur.mainRegion.end = nextstart;
            }else{
                cur.mainRegion.start = preend;
                cur.mainRegion.end = nextstart;
            }

            cur.mainRegion._onUpdate(0);
            panelRef.current?.forceUpdate();
        },
        isPlaying:()=>datas.current.waveform?.isPlaying() ?? false,
        play:async ()=>datas.current.waveform?.play(),
        pause:()=>datas.current.waveform?.pause(),
        getPanel:()=>panelRef.current,
    }),[]);

    return <Card cardStyle={cardStyle}>
        <SrtLineControlPanle srtLineContainer={localRef} waveformContainer={waveformContainer} ref={panelRef}/>
        <WaveformBox ref={containerRef} />
    </Card>;
});

