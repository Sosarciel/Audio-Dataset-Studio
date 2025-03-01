import { SrtSegment, Stream } from "@zwa73/utils";
import path from 'pathe';
import { SFfmpegTool } from "@zwa73/audio-utils";

export type SliceData ={
    inFilePath:string;
    seg:SrtSegment;
    outDir:string;
    index:number;
};
/**根据数据切分音频 */
export async function splitWavByData (sliceDatas:SliceData[],sep = '_Segment_'){
    //执行音频切分
    await Stream.from(sliceDatas)
        .concurrent(16)
        .map(async (dat)=>{
            const {index,outDir,seg} = dat;
            const inFilePath = dat.inFilePath;
            const {start,end} = seg;
            const audioIndex = index+1;
            const audioName = path.parse(inFilePath).name;

            const outPath   = path.join(outDir,`${audioName}${sep}${audioIndex}.wav`);
            console.log(`正在处理 ${inFilePath} ${start/1000}-->${(start+(end-start))/1000}`);
            await SFfmpegTool.cutAudio(inFilePath,outPath, start/1000, (end-start)/1000);
        }).append();
}