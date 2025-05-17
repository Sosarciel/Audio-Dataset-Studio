import { Button, Card, Modal, TextCard } from "@zwa73/react-utils";
import { createRef, forwardRef,Ref, useRef } from "react";
import { css } from "styled-components";
import { audioTookKitTooltipBoard } from "./AudioTookKitInterface";
import { AudioToolKitFileTable, AudioToolKitRef } from "./AudioToolKit";
import { BridgeProxy } from "../ContextProxy";
import path from 'pathe';



const cardStyle = css`
    background-color: var(--background-color-2);
    display: flex;
    overflow-x: hidden; /* 隐藏横向溢出 */
    white-space: nowrap; /* 防止换行 */
    text-align: left;
    border: 2px solid saddlebrown;
    border-radius: 8px;
    padding: 0.5em;
    height: 44px;
    &>*{
        margin-right: 0.5em;
    }
    &>:last-child{
        margin-right: 0em;
    }
    text-align: flex-start;
    align-items: flex-start;
    justify-content: flex-start;
`;

const textCardStyle = css`
    width: 4em;
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

    &>*{
        margin-right: 0.25em;
    }
    &>:last-child{
        margin-right: 0em;
    }
`;
//#endregion

export type AudioToolKitControlPanel = {
};

const _AudioToolKitControlPanel = forwardRef<AudioToolKitControlPanel>((prop:{},ref:Ref<AudioToolKitControlPanel>)=>{
    const saveModalRef = useRef<Modal>(null);
    const savePathCardRef = useRef<TextCard>(null);
    const spRef = useRef<TextCard>(null);
    const apRef = useRef<TextCard>(null);
    const hgRef = useRef<TextCard>(null);
    const ppRef = useRef<TextCard>(null);

    const onSpChanged = ()=>{
        const mod = spRef.current?.getText();
        if(mod==undefined) return;
        const numMod = parseFloat(mod);

        if(numMod<0){
            AudioToolKitRef.current!.getReactData().stepPrecision = -1;
            spRef.current?.setText(`-1`);
            return;
        }

        if(isNaN(numMod) || numMod<0.001 )
            return spRef.current?.setText(`${AudioToolKitRef.current?.getReactData().stepPrecision}`);

        const pnum = parseFloat(numMod.toFixed(3));

        AudioToolKitRef.current!.getReactData().stepPrecision = pnum;
        spRef.current?.setText(`${pnum}`);
    };

    const onApChanged = ()=>{
        const mod = apRef.current?.getText();
        if(mod==undefined) return;
        const numMod = parseFloat(mod);
        if(isNaN(numMod) || numMod<0 ) return apRef.current?.setText(`${AudioToolKitRef.current?.getReactData().additionalTime}`);

        const pnum = parseFloat(numMod.toFixed(3));

        AudioToolKitRef.current!.getReactData().additionalTime = pnum;
        apRef.current?.setText(`${pnum}`);
    };

    const onHgChange = async ()=>{
        const mod = hgRef.current?.getText();
        if(mod==undefined) return;
        const numMod = parseInt(mod);

        if(isNaN(numMod) || numMod<128 ){
            hgRef.current?.setText(`${AudioToolKitRef.current?.getReactData().lineHeight}`);
        }else{
            AudioToolKitRef.current!.getReactData().lineHeight = numMod;
            hgRef.current?.setText(`${numMod}`);
        }

        //const map = AudioToolKitRef.current?.getWavefromeMap();
        //if(map==undefined) return;
        //const list = Object.values(map);
        //await Promise.all(list.map(async w=>
        //    w.ref?.current?.getSrtLines().forEach((s)=>{
        //        const srtLineContainer = s.ref.current;
        //        if(srtLineContainer==null) return;
        //        srtLineContainer.updatePanel();
        //    }))
        //);
    };

    const onPpChange = async ()=>{
        const mod = ppRef.current?.getText();
        if(mod==undefined) return;
        const numMod = parseInt(mod);

        if(isNaN(numMod) || numMod<10 ){
            ppRef.current?.setText(`${AudioToolKitRef.current?.getReactData().peakPrecision}`);
        }else{
            AudioToolKitRef.current!.getReactData().peakPrecision = numMod;
            ppRef.current?.setText(`${numMod}`);
        }
    };


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
                panle?.changeAlign();
            }))
        );
    };

    return <Card cardStyle={cardStyle}>
        <Button content="保存工程" tooltip="将项目保存到文件" onClick={save} tooltipStyle={audioTookKitTooltipBoard}/>
        <Modal ref={saveModalRef} cardStyled={saveModalCardStyle}>
            <div>{"保存路径:"}</div>
            <TextCard tooltip="输入保存的文件路径" tooltipStyle={audioTookKitTooltipBoard}
                ref={savePathCardRef} editable={true} cardStyle={saveModalInputStyle}/>
            <Button content="保存" tooltip="将项目保存到文件" onClick={modalSave} tooltipStyle={audioTookKitTooltipBoard}/>
        </Modal>
        <Button content="加载工程" tooltip="从文件加载项目" tooltipStyle={audioTookKitTooltipBoard}/>
        <Button content="保存Srt" tooltip="全部保存为srt" onClick={allSave} tooltipStyle={audioTookKitTooltipBoard}/>
        <Button content="清空"     tooltip="清空全部音频" onClick={clear} tooltipStyle={audioTookKitTooltipBoard}/>
        <Button content="切换对齐" tooltip="切换对齐状态" onClick={changeAlign} tooltipStyle={audioTookKitTooltipBoard}/>
        <Card cardStyle={css`display:flex;`} tooltipStyle={audioTookKitTooltipBoard} tooltip="设置吸附步长精度, 小于0则不启用" >
            <span style={{ marginRight: '0.25em' }}>取整: </span>
            <TextCard editable ref={spRef} onChanged={onSpChanged} cardStyle={textCardStyle} content="0.1" />
            </Card>
        <Card cardStyle={css`display:flex;`} tooltipStyle={audioTookKitTooltipBoard} tooltip="若最后一段的结束点等同于音频长度, 则保存srt时会将其延长一定时间" >
            <span style={{ marginRight: '0.25em' }}>追加: </span>
            <TextCard editable ref={apRef} onChanged={onApChanged} cardStyle={textCardStyle} content="0" />
        </Card>
        <Card cardStyle={css`display:flex;`} tooltipStyle={audioTookKitTooltipBoard} tooltip="每行的高度" >
            <span style={{ marginRight: '0.25em' }}>行高: </span>
            <TextCard editable ref={hgRef} onChanged={onHgChange} cardStyle={textCardStyle} content="128" />
        </Card>
        <Card cardStyle={css`display:flex;`} tooltipStyle={audioTookKitTooltipBoard} tooltip="peaks的精度 1/x" >
            <span style={{ marginRight: '0.25em' }}>精度: </span>
            <TextCard editable ref={hgRef} onChanged={onPpChange} cardStyle={textCardStyle} content="128" />
        </Card>
    </Card>;
});

export const {AudioToolKitControlPanelRef,AudioToolKitControlPanelElement} = (()=>{
    const AudioToolKitControlPanelRef = createRef<AudioToolKitControlPanel>();
    const AudioToolKitControlPanelElement = <_AudioToolKitControlPanel ref={AudioToolKitControlPanelRef} />;
    return {AudioToolKitControlPanelRef,AudioToolKitControlPanelElement};
})();