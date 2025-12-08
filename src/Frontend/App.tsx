import { CssBaseline, GlobalStyles } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { AudioToolKitControlPanelElement, AudioToolKitElement } from "./AudioToolKit";
import { theme } from "./Theme";


export const App = () => {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <GlobalStyles styles={{
                body: {
                    fontFamily: '"Microsoft YaHei", sans-serif',
                    lineHeight: 1.35,
                }
            }} />
            {AudioToolKitControlPanelElement}
            {AudioToolKitElement}
        </ThemeProvider>
    );
};
