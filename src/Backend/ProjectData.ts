import { SrtSegment } from "@zwa73/utils";


export type SavedLineData = SrtSegment&{
    index: number;
    /**自动对齐状态 */
    is_align:boolean;
}

export type SavedAudioData = {
    /** 音频文件路径 */
    path: string;
    lines:SavedLineData[];
}
/**保存的项目路径 */
export type SavedProjectData = {
    /** 项目包含的音频 */
    audio_table:{
        [name:string]:SavedAudioData;
    }
};