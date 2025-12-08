import React, { MutableRefObject } from "react";
import { WaveformContainer, WaveformContainerData } from "./WaveformContainer";
import { AudioToolKitRef } from "../AudioToolKit";
import { audioTookKitTooltipBoard } from "../AudioTookKitInterface";
import { css } from "@emotion/react";
import { SButton, SCard } from "@zwa73/react-utils";











const cardStyle = css`
    box-sizing: border-box;
    position: relative;
    display: flex;
    overflow-x: hidden; /* 隐藏横向溢出 */
    white-space: nowrap; /* 防止换行 */
    text-align: left;
    padding: 0.5em;
    gap: 0.5em;
`;
const buttonStyle = css``;

export type WaveformControlPanelProp = {
    data:WaveformContainerData;
    waveformContainer:MutableRefObject<WaveformContainer>;
}

export const WaveformControlPanel:React.FC<WaveformControlPanelProp> = (props:WaveformControlPanelProp)=>{
    const {data,waveformContainer} = props;

    const del = ()=>{
        AudioToolKitRef.current?.removeWaveform(data.audioData?.name);
    };
    const add = ()=>{
        waveformContainer.current.addSrtLine(-1);
    };
    const save = async ()=>{
        await waveformContainer.current.saveSrtFile();
    };

    const split = async()=>{
        await waveformContainer.current.split();
    };

    return <SCard cardStyle={cardStyle} >
        <SButton cardStyle={buttonStyle} content="删除" onClick={del} tooltip="删除此段"        tooltipStyle={audioTookKitTooltipBoard}/>
        <SButton cardStyle={buttonStyle} content="添加" onClick={add} tooltip="在此行下方新增"  tooltipStyle={audioTookKitTooltipBoard}/>
        <SButton cardStyle={buttonStyle} content="保存" onClick={save} tooltip="覆盖保存到原srt路径"  tooltipStyle={audioTookKitTooltipBoard}/>
        <SButton cardStyle={buttonStyle} content="切分" onClick={split} tooltip="根据srt切分音频"  tooltipStyle={audioTookKitTooltipBoard}/>
        <SCard >{data.audioData.name}</SCard>
    </SCard>;
};
