import { SrtSegment, Stream } from "@zwa73/utils";
import path from 'pathe';
import { FfmpegStream } from "@zwa73/audio-utils";

export type SliceData ={
    inFilePath:string;
    seg:SrtSegment;
    outDir:string;
    index:number;
};
/**根据数据切分音频 */
export async function splitAudioByData (sliceDatas:SliceData[],sep = '_Segment_'){
    //执行音频切分
    await Stream.from(sliceDatas,16)
        .map(async dat=>{
            const {index,outDir,seg} = dat;
            const inFilePath = dat.inFilePath;
            const {start,end} = seg;
            const audioIndex = index+1;
            const audioName = path.parse(inFilePath).name;

            const ext = path.parse(inFilePath).ext;

            const outPath   = path.join(outDir,`${audioName}${sep}${audioIndex}${ext}`);
            console.log(`正在处理 ${inFilePath} ${start/1000}-->${end/1000}`);
            await FfmpegStream.create().trim({start:start/1000, end:end/1000}).apply(inFilePath,outPath);
        }).apply();
}