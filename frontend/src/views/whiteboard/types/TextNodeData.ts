import { TypographyVariant } from "@mui/material";

export interface TextNodeData {
  text: string;
  variant: TypographyVariant;
  color: string;
  bgcolor: string;
  horizontalAlign: "left" | "center" | "right";
  verticalAlign: "top" | "center" | "bottom";
  bold: boolean;
  italic: boolean;
  underline: boolean;
}
