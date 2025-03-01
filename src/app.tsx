import { createRoot } from 'react-dom/client';
import { AudioToolKitElement,AudioToolKitControlPanelElement } from 'Frontend';
import { UtilRT } from '@zwa73/react-utils';

UtilRT.setStyleVar(document.documentElement,{
    "--background-color-1": "rgb(16, 18, 18)",  // 深色背景1
    "--background-color-2": "rgb(32, 34, 34)",  // 深色背景2
    "--background-color-3": "rgb(48, 50, 50)",  // 深色背景3
    "--background-color-1-trans": "rgba(16, 18, 18, 0.5)",  // 深色背景1透明
    "--font-color-1": "rgb(200, 200, 200)",     // 亮色字体1
    "--font-color-2": "rgb(100, 149, 237)",     // 亮色字体2 (CornflowerBlue)
});
const container = document.getElementById('app-root')!;
const root = createRoot(container);
root.render(
<>
    {AudioToolKitControlPanelElement}
    {AudioToolKitElement}
</>
);