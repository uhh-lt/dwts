import React from "react";
import "./App.css";
import { useRoutes } from "react-router-dom";
import routes from "./router/routes";
import { ThemeProvider, createTheme } from "@mui/material";

const theme = createTheme({
  palette: {
    secondary: {
      main: '#185cc9'
    }
  }
})

function App() {
  const element = useRoutes(routes);
  return <ThemeProvider theme={theme}>{element}</ThemeProvider>;
}

export default App;
