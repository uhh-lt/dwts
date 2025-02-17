import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CheckBoxOutlinedIcon from "@mui/icons-material/CheckBoxOutlined";
import FormatListBulletedOutlinedIcon from "@mui/icons-material/FormatListBulletedOutlined";
import NumbersIcon from "@mui/icons-material/Numbers";
import SubjectIcon from "@mui/icons-material/Subject";
import { ReactElement } from "react";
import { MetaType } from "../../../../api/openapi/models/MetaType.ts";

export const metaTypeToIcon: Record<MetaType, ReactElement> = {
  [MetaType.STRING]: <SubjectIcon />,
  [MetaType.NUMBER]: <NumbersIcon />,
  [MetaType.DATE]: <CalendarMonthIcon />,
  [MetaType.BOOLEAN]: <CheckBoxOutlinedIcon />,
  [MetaType.LIST]: <FormatListBulletedOutlinedIcon />,
};
