import { createTheme } from '@mui/material/styles';
export const theme = createTheme({
    palette: {
        mode: 'dark',
        background: {
          default: 'rgb(16, 18, 18)',   // 深色背景1
          paper: 'rgb(32, 34, 34)',     // 深色背景2
        },
        text: {
          primary: 'rgb(200, 200, 200)',        // 亮色字体1
          secondary: 'rgb(100, 149, 237)',      // 亮色字体2 (CornflowerBlue)
        },
        primary: {
          main: 'rgb(100, 149, 237)',           // 用亮色字体2作为主色
        },
        secondary: {
          main: 'rgb(200, 200, 200)',           // 用亮色字体1作为次色
        },
    },
});
