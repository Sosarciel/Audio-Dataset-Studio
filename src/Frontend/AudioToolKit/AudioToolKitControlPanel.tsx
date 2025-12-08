import { SButton, SCard, Modal, TextCard } from "@zwa73/react-utils";
import { createRef, forwardRef, Ref, useRef } from "react";
import { audioTookKitTooltipBoard } from "./AudioTookKitInterface";
import { AudioToolKitData, AudioToolKitFileTable, AudioToolKitRef } from "./AudioToolKit";
import { BridgeProxy } from "../ContextProxy";
import path from 'pathe';
import { Box, styled } from "@mui/material";
import { css } from "@mui/styled-engine";



const Topbar = styled(Box)`
    background-color: var(--background-color-2);
    display: flex;
    overflow: hidden; /* 隐藏横向溢出 */
    white-space: nowrap; /* 防止换行 */
    text-align: left;
    border: 2px solid saddlebrown;
    border-radius: 8px;
    padding: 0.5em;
    height: 44px;
    gap: 0.5em;
    text-align: flex-start;
    align-items: flex-start;
    justify-content: flex-start;
`;

const textCardStyle = css`
    width: 4em;
`;
const textCardMinStyle = css`
    width: 2.5em;
`;


//#region save
const saveModalInputStyle = css`
    width: max(50vw,12em);
    border: 2px dashed #5b4513;
`;
const saveModalCardStyle = css`
    border: 2px solid saddlebrown;
    border-radius: 8px;
    padding: 0.5em;

    && > *{
        margin-right: 0.25em;
    }
    && > :last-child{
        margin-right: 0em;
    }
`;
//#endregion

export type AudioToolKitControlPanel = {
};


const changeFunctor = (opt:{
    ref:React.RefObject<TextCard>,
    min?:number,
    max?:number,
    field:keyof AudioToolKitData;
    parseFn:(value:string)=>number;
}) => {
    const {ref,min,max,field,parseFn} = opt;
    return async ()=>{
        const mod = ref.current?.getText();
        if(mod==undefined) return;

        if(isNaN(parseInt(mod)))
            return ref.current?.setText(`${AudioToolKitRef.current?.getReactData()[field]}`);

        const numMod = parseFn(mod);

        if((min!=undefined && numMod<min) || (max!=undefined && numMod>max))
            return ref.current?.setText(`${AudioToolKitRef.current?.getReactData()[field]}`);

        AudioToolKitRef.current!.getReactData()[field] = numMod as any;
        ref.current?.setText(`${numMod}`);
    };
};

const fixed3 = (v:string)=>parseFloat(parseFloat(v).toFixed(3));

const _AudioToolKitControlPanel = forwardRef<AudioToolKitControlPanel>((prop:{},ref:Ref<AudioToolKitControlPanel>)=>{
    const saveModalRef = useRef<Modal>(null);
    const savePathCardRef = useRef<TextCard>(null);
    const spRef = useRef<TextCard>(null);
    const apRef = useRef<TextCard>(null);
    const hgRef = useRef<TextCard>(null);
    const ppRef = useRef<TextCard>(null);
    const vsRef = useRef<TextCard>(null);
    const mtRef = useRef<TextCard>(null);

    const onSpChanged = changeFunctor({
        min:0.001,
        parseFn:fixed3,
        ref:spRef,
        field:"stepPrecision",
    });

    const onApChanged = changeFunctor({
        min:0,
        parseFn:fixed3,
        ref:apRef,
        field:"additionalTime",
    });

    const onHgChange = changeFunctor({
        min:128,
        parseFn:parseInt,
        ref:hgRef,
        field:"lineHeight",
    });

    const onPpChange = changeFunctor({
        min:10,
        field:"peakPrecision",
        ref:ppRef,
        parseFn:parseInt,
    });

    const onVsChange = changeFunctor({
        min:0.1,
        field:"vScale",
        ref:vsRef,
        parseFn:fixed3,
    });

    const onMtChange = changeFunctor({
        min:-100,
        field:"muteThreshhold",
        ref:mtRef,
        parseFn:fixed3,
    });


    const save = ()=>saveModalRef.current?.show(true);
    const modalSave = async ()=>{
        const dat = AudioToolKitRef.current?.saveToJson();
        const savepath = savePathCardRef.current?.getText() ?? '';
        const basepath = await BridgeProxy.getAppPath();
        const fullpath = path.isAbsolute(savepath)
            ? savepath
            : path.join(basepath, savepath);
        void BridgeProxy.writeJSONFile(fullpath,dat,{compress:true});
        saveModalRef.current?.show(false);
    };

    const allSave = async ()=>{
        const map = AudioToolKitRef.current?.getWavefromeMap();
        if(map==undefined) return;
        const list = Object.values(map);
        await Promise.all(list.map(async w=>
            w.ref?.current?.saveSrtFile()
        ));
    };

    const clear = ()=>{
        Object.keys(AudioToolKitFileTable).forEach((n)=>AudioToolKitRef.current?.removeWaveform(n));
    };

    const changeAlign = async ()=>{
        const map = AudioToolKitRef.current?.getWavefromeMap();
        if(map==undefined) return;
        const list = Object.values(map);
        await Promise.all(list.map(async w=>
            w.ref?.current?.getSrtLines().forEach((s)=>{
                const srtLineContainer = s.ref.current;
                if(srtLineContainer==null) return;
                const panle = srtLineContainer.getPanel();
                panle?.changeAlign(false);
            }))
        );
    };

    return <Topbar>
        <SButton content="保存工程" tooltip="将项目保存到文件" onClick={save} tooltipStyle={audioTookKitTooltipBoard}/>
        <Modal ref={saveModalRef} cardStyled={saveModalCardStyle}>
            <div>{"保存路径:"}</div>
            <TextCard tooltip="输入保存的文件路径" tooltipStyle={audioTookKitTooltipBoard}
                ref={savePathCardRef} editable={true} cardStyle={saveModalInputStyle}/>
            <SButton content="保存" tooltip="将项目保存到文件" onClick={modalSave} tooltipStyle={audioTookKitTooltipBoard}/>
        </Modal>
        <SButton content="加载工程" tooltip="从文件加载项目" tooltipStyle={audioTookKitTooltipBoard}/>
        <SButton content="保存Srt" tooltip="全部保存为srt" onClick={allSave} tooltipStyle={audioTookKitTooltipBoard}/>
        <SButton content="清空"     tooltip="清空全部音频" onClick={clear} tooltipStyle={audioTookKitTooltipBoard}/>
        <SButton content="切换对齐" tooltip="切换对齐状态" onClick={changeAlign} tooltipStyle={audioTookKitTooltipBoard}/>
        <SCard cardStyle={css`display:flex;`} tooltipStyle={audioTookKitTooltipBoard} tooltip="设置吸附步长精度, 小于0则不启用" >
            <span style={{ marginRight: '0.25em' }}>取整: </span>
            <TextCard editable ref={spRef} onChanged={onSpChanged} cardStyle={textCardStyle} content="0.1" />
        </SCard>
        <SCard cardStyle={css`display:flex;`} tooltipStyle={audioTookKitTooltipBoard} tooltip="震幅缩放" >
            <span style={{ marginRight: '0.25em' }}>缩放: </span>
            <TextCard editable ref={vsRef} onChanged={onVsChange} cardStyle={textCardMinStyle} content="1" />
        </SCard>
        <SCard cardStyle={css`display:flex;`} tooltipStyle={audioTookKitTooltipBoard} tooltip="若最后一段的结束点等同于音频长度, 则保存srt时会将其延长一定时间" >
            <span style={{ marginRight: '0.25em' }}>追加: </span>
            <TextCard editable ref={apRef} onChanged={onApChanged} cardStyle={textCardMinStyle} content="0" />
        </SCard>
        <SCard cardStyle={css`display:flex;`} tooltipStyle={audioTookKitTooltipBoard} tooltip="每行的高度" >
            <span style={{ marginRight: '0.25em' }}>行高: </span>
            <TextCard editable ref={hgRef} onChanged={onHgChange} cardStyle={textCardMinStyle} content="128" />
        </SCard>
        <SCard cardStyle={css`display:flex;`} tooltipStyle={audioTookKitTooltipBoard} tooltip="peaks的精度 1/x" >
            <span style={{ marginRight: '0.25em' }}>精度: </span>
            <TextCard editable ref={ppRef} onChanged={onPpChange} cardStyle={textCardMinStyle} content="128" />
        </SCard>
        <SCard cardStyle={css`display:flex;`} tooltipStyle={audioTookKitTooltipBoard} tooltip="静音阈值 (dB) -100时视为无" >
            <span style={{ marginRight: '0.25em' }}>阈值: </span>
            <TextCard editable ref={mtRef} onChanged={onMtChange} cardStyle={textCardMinStyle} content="-100" />
        </SCard>
    </Topbar>;
});

export const {AudioToolKitControlPanelRef,AudioToolKitControlPanelElement} = (()=>{
    const AudioToolKitControlPanelRef = createRef<AudioToolKitControlPanel>();
    const AudioToolKitControlPanelElement = <_AudioToolKitControlPanel ref={AudioToolKitControlPanelRef} />;
    return {AudioToolKitControlPanelRef,AudioToolKitControlPanelElement};
})();