import WaveSurfer from "wavesurfer.js";
import regions from "wavesurfer.js/dist/plugins/regions";
import { AudioFileData, SrtFileData } from "./AudioTookKitInterface";
import { AudioToolKitRef, WebUtilsProxy } from "Frontend";
import { JsFunc } from "@zwa73/js-utils";

//const thresholdDb = -50;
//const thresholdAmplitude = Math.pow(10, thresholdDb / 20); // 计算振幅

export const db2amp = JsFunc.memoize((db:number) => {
    console.log('memoize');
    if(db<=-100) return 0;
    return Math.pow(10, db / 20);
});

const renderFilter = (val:number) => Math.abs(val)>=db2amp((AudioToolKitRef.current?.getReactData().muteThreshhold??0));


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
        height: AudioToolKitRef.current?.getReactData().lineHeight??128,
        renderFunction: (channelData, ctx) => {
                //http://github.com/katspaugh/wavesurfer.js/blob/07f1ab1e7e36bc6faa3a23678afb86252478dc8e/src/renderer.ts
                const optBarWidth = 1;
                const optbarGap = 0;
                const optbarRadius = 0;
                const optBarAlign = "mid" as string;
                const vScale = AudioToolKitRef.current?.getReactData().vScale??1;

                const topChannel = channelData[0];
                const bottomChannel = channelData[1] || channelData[0];
                const length = topChannel.length;
                //console.log(topChannel);

                const { width, height } = ctx.canvas;
                const halfHeight = height / 2;
                const pixelRatio = 1;

                const barWidth = optBarWidth ? optBarWidth * pixelRatio : 1;
                const barGap = optbarGap
                    ? optbarGap * pixelRatio
                    : optBarWidth
                    ? barWidth / 2
                    : 0;
                const barRadius = optbarRadius ?? 0;
                const barIndexScale = width / (barWidth + barGap) / length;

                const rectFn = barRadius && "roundRect" in ctx ? "roundRect" : "rect";

                ctx.beginPath();

                let prevX = 0;
                let maxTop = 0;
                let maxBottom = 0;
                for (let i = 0; i <= length; i++) {
                    if(!renderFilter(topChannel[i]))
                        continue;

                    const x = Math.round(i * barIndexScale);

                    if (x > prevX) {
                        const topBarHeight = Math.round(maxTop * halfHeight * vScale);
                        const bottomBarHeight = Math.round(maxBottom * halfHeight * vScale);
                        const barHeight = topBarHeight + bottomBarHeight || 1;

                        // Vertical alignment
                        let y = halfHeight - topBarHeight;
                        if (optBarAlign === "top") {
                            y = 0;
                        } else if (optBarAlign === "bottom") {
                            y = height - barHeight;
                        }

                        (ctx as any)[rectFn](prevX * (barWidth + barGap), y, barWidth, barHeight, barRadius);

                        prevX = x;
                        maxTop = 0;
                        maxBottom = 0;
                    }

                    const magnitudeTop = Math.abs(topChannel[i] || 0);
                    const magnitudeBottom = Math.abs(bottomChannel[i] || 0);
                    if (magnitudeTop > maxTop) maxTop = magnitudeTop;
                    if (magnitudeBottom > maxBottom) maxBottom = magnitudeBottom;
                }

                ctx.fill();
                ctx.closePath();
        },
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
                const peaks = waveform.exportPeaks({
                        maxLength:dur*(AudioToolKitRef.current?.getReactData().peakPrecision ?? 128),
                    });
                //console.log(AudioToolKitRef.current?.getReactData().peakPrecision ?? 1280);
                //console.log(peaks);
                //peak精度为1/256
                reslove({
                    peaks,
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


