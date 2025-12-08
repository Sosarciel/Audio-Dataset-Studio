import React, { MutableRefObject, Ref, forwardRef, useEffect, useRef } from "react";
import { AudioFileData } from "../AudioTookKitInterface";
import { getWaveform, loadWaveform } from "../Util";
import type { Region } from "wavesurfer.js/dist/plugins/regions";
import { WaveformContainer } from "./WaveformContainer";
import { UtilRH } from "@zwa73/react-utils";
import { SrtLineControlPanle } from "./SrtLineControlPanle";
import WaveSurfer from "wavesurfer.js";
import { AudioToolKitRef } from "../AudioToolKit";
import { SrtSegment } from "@zwa73/utils";
import { css } from "@mui/styled-engine";
import { SCard } from "@zwa73/react-utils";
import styled from "@mui/styled-engine";
import { Box } from "@mui/material";


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
    refocus:(init?:boolean)=>void;
    /**重设索引键 */
    setIndex:(i:number)=>void;
    getSrtData:()=>SrtSegment;
    /**重新对齐 */
    reAlign:()=>void;
    pause:()=>void;
    play:()=>Promise<void>;
    isPlaying:()=>boolean;
    getPanel: () => SrtLineControlPanle | null;
    /**设置缩放偏移
     * @param sign - 正为放大, 负为缩小
     */
    modifyZoom: (sign:number)=>void;
    setCurrentSrtLine:()=>void;
};


export type SrtLineContainerData = {
    duration:number;
    /**是否为对齐状态 */
    isAlign:boolean;
    /**索引键 */
    segmentsIndex:number;
    mainRegion?:Region;
    waveform?:WaveSurfer;
    /**缩放修正 */
    zoomBonus:number;
    /**析构函数 */
    dcoList:(()=>void)[];
};

/**计算焦点位置数据 */
function recalcSize(el:HTMLDivElement ,data:SrtLineContainerData){
    // 计算 zoom 级别，使 region 区域缩放到窗口大小的 90%
    const containerWidth = el.offsetWidth/data.duration;
    const regionWidth = Math.max(data.mainRegion!.end - data.mainRegion!.start,1);

    return{
        regionWidth,
        zoomLevel   : (data.duration * containerWidth * data.zoomBonus) / regionWidth,
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

const WaveformBox = styled(Box)`
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
        isAlign        : false,
        zoomBonus      : 0.5,
        dcoList       : []
    });

    useEffect(() => {
        const {region,waveform} = getWaveform(containerRef.current!);
        datas.current!.waveform = waveform;

        waveform.on('ready',()=>{
            const cur = datas.current;
            //建立区域
            cur.mainRegion = region.addRegion({
                start :srtSegment.start/1000,
                end   :srtSegment.end  /1000,
                resize:true,
                contentEditable:true,
                content:srtSegment.text,
                drag:false,
                color: 'rgba(200, 200, 200, 0.5)',
            });

            const contentBlock = cur.mainRegion.content!;
            const formatElement = (srt:SrtSegment)=>srtSegment.text
                .split("\n")
                .reduce<JSX.Element[]>((acc, str, index) => {
                    //console.log(str);
                    acc.push(<span
                        style={{
                            color: "#2F4F4F",
                            textShadow: "0 0 1px black",
                            pointerEvents: "none",   // 禁用鼠标事件
                        }}
                        spellCheck={false}   // 关闭拼写检查
                        key={Math.random()}>{str}</span>);
                    if (index < srtSegment.text.split("\n").length - 1)
                        acc.push(<br key={Math.random()} />);
                    return acc;
                }, []);
            //datas.current.contentRoot = createRoot(cur.mainRegion.content!);
            //datas.current.contentRoot.render(formatElement(srtSegment));

            const createSpan = (text?:string)=>{
                const span = document.createElement("span");
                span.style.color = "#FAFAF5";
                span.style.textShadow = "0 0 1px black";
                span.style.pointerEvents = "none";
                span.spellcheck = false;
                span.style.whiteSpace = "pre-line";
                if(text) span.textContent = text;
                return span;
            };

            const handlerBlur = () => {
                requestAnimationFrame(() => {
                    const newText = localRef.current?.getSrtData();
                    if (!newText) return;

                    // 清空原有内容
                    while (contentBlock.firstChild)
                        contentBlock.removeChild(contentBlock.firstChild);
                    // 插入新的 DOM 节点
                    contentBlock.appendChild(createSpan(newText.text));
                });
            };
            const handlePaste = (e:ClipboardEvent) => {
                e.preventDefault();
                const text = e.clipboardData?.getData("text/plain");
                if (text) {
                    // 在光标位置插入纯文本
                    document.execCommand("insertText", false, text);
                }
            };

            // 绑定事件
            contentBlock.addEventListener("blur", handlerBlur);
            contentBlock.addEventListener("paste", handlePaste);
            cur.dcoList.push(
                () => contentBlock.removeEventListener("blur", handlerBlur),
                () => contentBlock.removeEventListener("paste", handlePaste)
            );

            // 初始渲染
            while (contentBlock.firstChild)
                contentBlock.removeChild(contentBlock.firstChild);
            contentBlock.appendChild(createSpan(srtSegment.text));

            cur.mainRegion.on("update-end",()=>{
                //取整吸附
                const reg = cur.mainRegion;
                if(reg==null) return;

                const pos = cur.waveform?.getScroll();

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
                    const preLine = srtLines[cur.segmentsIndex-1];
                    preLine.ref.current?.reAlign();
                }

                if(cur.segmentsIndex<srtLines.length-1){
                    const nextLine = srtLines[cur.segmentsIndex+1];
                    nextLine.ref.current?.reAlign();
                }

                reg._onUpdate(0);
                panelRef.current?.forceUpdate();
                if(pos!=undefined)
                    cur.waveform?.setScroll(pos);
            });

            const handlerClick = () => {
                const cur = waveformContainer.current;
                cur.getSrtLines().forEach(srt=>{
                    if(srt.ref.current?.getData().segmentsIndex == datas.current.segmentsIndex)
                        srt.ref.current?.setCurrentSrtLine();
                });
                Object.values(AudioToolKitRef.current?.getWavefromeMap()??{}).forEach( con =>{
                    const concur = con.ref?.current;
                    if(concur==null) return;
                    const srtLines = concur.getSrtLines()??[];
                    srtLines.forEach(srt => {
                        if(concur==cur && srt.ref.current?.getData().segmentsIndex == datas.current.segmentsIndex) return;
                        srt.ref.current?.pause();
                    });
                });
            };
            containerRef.current?.addEventListener("click", handlerClick);
            cur.dcoList.push(()=>containerRef.current?.removeEventListener('click',handlerClick));

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
            datas.current.dcoList.forEach(v=>v());
        };
    }, []);


    const localRef:React.MutableRefObject<SrtLineContainer> = UtilRH.useLocalRef<SrtLineContainer>(ref,()=>({
        getData:()=>datas.current!,
        updatePanel:()=>panelRef.current?.forceUpdate(),
        refocus:(init=true)=>{
            const cur = datas.current;
            if(init) cur.zoomBonus = 0.5;

            if(containerRef.current==undefined) return;

            const {regionWidth,zoomLevel} = recalcSize(containerRef.current,cur);

            cur.waveform?.zoom(zoomLevel);
            if(init)
                cur.waveform?.setScrollTime(datas.current.mainRegion!.start - regionWidth/2);
        },
        setIndex:(i)=>datas.current.segmentsIndex = i,
        getSrtData:()=>{
            const reg = datas.current.mainRegion!;
            const refn = (node: ChildNode): string => {
                if (node.nodeType === Node.TEXT_NODE)
                    return node.textContent ?? "";
                else if (node.nodeName === "BR")
                    return "\n";
                else if (node.nodeType === Node.ELEMENT_NODE)
                    return Array.from(node.childNodes).map(refn).join("") + "\n";
                return "";
            };

            const result = reg.content?.childNodes
                ? Array.from(reg.content.childNodes).map(refn).join("") : "";
            return {
                end  :Math.round(reg.end  *1000),
                start:Math.round(reg.start*1000),
                text :result.replace(/\r\n/g,"\n").replace(/\n\n/g,'\n').trim(),
            };
        },
        reAlign:()=>{
            const cur = datas.current;
            if(cur.mainRegion==null) return;

            const pos = cur.waveform?.getScroll();

            const srtLines = waveformContainer.current.getSrtLines();
            const preEnd = srtLines[cur.segmentsIndex-1]?.ref.current?.getData().mainRegion?.end ?? 0;
            const nextStart = srtLines[cur.segmentsIndex+1]?.ref.current?.getData().mainRegion?.start ?? waveformContainer.current.getData().duration;

            //如果未对齐则只控制超出部分
            if(!cur.isAlign){
                if(cur.mainRegion.start < preEnd)
                    cur.mainRegion.start = preEnd;
                if(cur.mainRegion.end > nextStart)
                    cur.mainRegion.end = nextStart;
            }else{
                cur.mainRegion.start = preEnd;
                cur.mainRegion.end = nextStart;
            }

            cur.mainRegion._onUpdate(0);
            panelRef.current?.forceUpdate();
            if(pos!=undefined)
                cur.waveform?.setScroll(pos);
        },
        isPlaying:()=>datas.current.waveform?.isPlaying() ?? false,
        play:async ()=>datas.current.waveform?.play(),
        pause:()=>datas.current.waveform?.pause(),
        setCurrentSrtLine:()=>AudioToolKitRef.current?.setCurrentSrtLine(localRef.current),
        getPanel:()=>panelRef.current,
        modifyZoom:(sign)=>{
            const cur = datas.current;
            const factor = 2.5;
            const step = Math.floor(cur.zoomBonus/factor);
            const min = 0.1;
            const minStep = Math.max(min, step);
            cur.zoomBonus = Math.sign(sign)>0
                ? cur.zoomBonus + minStep
                : Math.max(min, cur.zoomBonus - minStep);
            localRef.current.refocus(false);
        }
    }),[]);

    return <SCard cardStyle={cardStyle}>
        <SrtLineControlPanle srtLineContainer={localRef} waveformContainer={waveformContainer} ref={panelRef}/>
        <WaveformBox ref={containerRef} />
    </SCard>;
});

