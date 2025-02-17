import { CardProps } from "@mui/material";
import { AnnotationRead } from "./AnnotationRead.ts";

export interface AnnotationCardProps<T extends AnnotationRead> {
  annotation: T;
  onClick: () => void;
  cardProps?: CardProps;
  isSelected: boolean;
}
