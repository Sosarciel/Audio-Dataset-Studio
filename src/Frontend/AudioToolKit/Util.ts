import WaveSurfer from "wavesurfer.js";
import regions from "wavesurfer.js/dist/plugins/regions";
import { AudioFileData, SrtFileData } from "./AudioTookKitInterface";
import { AudioToolKitRef, WebUtilsProxy } from "Frontend";

export function getWaveform(container:HTMLDivElement){
    const region = regions.create();
    const waveform = WaveSurfer.create({
        container,
        waveColor: "steelblue",
        progressColor: "lightblue",
        backend: "MediaElement",
        dragToSeek:true,
        autoScroll:false,
        autoplay:false,
        autoCenter:false,
        hideScrollbar:true,
        plugins: [ region ],
        fillParent:true,
        barWidth:1,
        height: AudioToolKitRef.current?.getReactData().lineHeight??128
    });

    waveform.on("ready", () => {
        container.addEventListener("click", e => {
            if(waveform.isPlaying())
                waveform.pause();
            else void waveform.play();
        });
    });

    return { region, waveform };
}


export function parseFileName(file:File){
    const fileName = file.name;
    // 检查文件名是否包含点号
    if (fileName.includes('.')) {
        // 将文件名按点号分割成数组
        const ls = fileName.split('.');
        // 移除最后一个元素（扩展名）
        const ext = ls.pop()!;
        // 重新组合成字符串并返回
        const name = ls.join('.');
        return { name, ext };
    }
    // 如果文件名不包含点号，返回文件名和空的扩展名
    return { name: fileName, ext: '' };
}

const vaildAudio = ['wav','flac'];
const vaildSrt   = ['srt'];
export async function getFileData(file:File){
    return new Promise<AudioFileData|SrtFileData|undefined>((reslove)=>{
        const pname = parseFileName(file);
        const path = WebUtilsProxy.getPathForFile(file);

        if(![...vaildAudio,...vaildSrt].includes(pname.ext)) reslove(undefined);

        const reader = new FileReader();
        if(vaildAudio.includes(pname.ext)){
            reader.onload = e => reslove({
                blob:new Blob([e.target!.result!],{type:`audio/${pname.ext}`}),
                file,path,
                type:"Audio",
                ...pname,
            });
            reader.readAsArrayBuffer(file);
        }
        if(vaildSrt.includes(pname.ext)) {
            reader.onload = e => reslove({
                text:e.target!.result as string,
                file,path,
                type:"Srt",
                ...pname,
            });
            reader.readAsText(file);
        }
    });
}


const waveformCache:Record<string,Promise<{
    dur:number;
    peaks:number[][];
}>> = {};
export async function loadWaveform(waveform:WaveSurfer,data:AudioFileData,useCache:boolean=true) {
    const key = data.path;
    if(!useCache || waveformCache[key]==undefined){
        waveformCache[key] = new Promise((reslove)=>{
            waveform.on('decode',()=>{
                const dur = waveform.getDuration();
                //peak精度为1/256
                reslove({
                    peaks:waveform.exportPeaks({
                        maxLength:dur*(AudioToolKitRef.current?.getReactData().peakPrecision ?? 128)
                    }),
                    dur,
                });
            });
        });
        await waveform.loadBlob(data.blob);
        const {dur,peaks} = await waveformCache[key];
        return dur;
    }
    const {dur,peaks} = await waveformCache[key];
    await waveform.loadBlob(data.blob,peaks,dur);
    return dur;
}


