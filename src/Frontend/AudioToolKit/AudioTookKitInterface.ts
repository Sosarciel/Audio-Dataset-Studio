import { css } from "@mui/styled-engine";



export type AudioFileData = {
    blob:Blob;
    file:File;
    type:'Audio';
    name:string;
    ext:string;
    path:string;
}
export type SrtFileData = {
    text:string;
    file:File;
    type:'Srt';
    name:string;
    ext:string;
    path:string;
}

export const audioTookKitTooltipBoard = css`
    background-color: var(--background-color-3);
    font-size: 0.8rem;
    color: var(--font-color-2);
    border-radius: 8px;
    padding: 0.5em;
`;