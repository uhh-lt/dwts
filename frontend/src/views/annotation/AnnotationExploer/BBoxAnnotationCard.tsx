import {
  Card,
  CardActionArea,
  CardContent,
  CardHeader,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import CodeHooks from "../../../api/CodeHooks.ts";
import SdocHooks from "../../../api/SdocHooks.ts";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import { BBoxAnnotationRead } from "../../../api/openapi/models/BBoxAnnotationRead.ts";
import CodeRenderer from "../../../components/Code/CodeRenderer.tsx";
import UserName from "../../../components/User/UserName.tsx";
import ImageCropper from "../../whiteboard/nodes/ImageCropper.tsx";
import AnnotationCardActionsMenu from "./AnnotationCardActionMenu.tsx";
import AnnotationCardMemo from "./AnnotationCardMemo.tsx";
import { AnnotationCardProps } from "./types/AnnotationCardProps.ts";

function BBoxAnnotationCard({ isSelected, annotation, onClick, cardProps }: AnnotationCardProps<BBoxAnnotationRead>) {
  const sdocData = SdocHooks.useGetDocumentData(annotation.sdoc_id);
  const code = CodeHooks.useGetCode(annotation.code_id);

  return (
    <Card {...cardProps}>
      <CardHeader
        title={<CodeRenderer key={annotation.code_id} code={annotation.code_id} />}
        action={
          <AnnotationCardActionsMenu
            annotationId={annotation.id}
            annotationType={AttachedObjectType.BBOX_ANNOTATION}
            iconButtonProps={{ size: "small" }}
          />
        }
        titleTypographyProps={{
          variant: "body1",
          display: "flex",
          alignItems: "center",
        }}
        sx={{ px: 1, py: 0.5 }}
      />
      <Divider />
      <CardActionArea onClick={onClick}>
        <CardContent sx={{ p: 1, pb: "0px !important", textAlign: "center" }}>
          {sdocData.isSuccess && code.isSuccess ? (
            <ImageCropper
              imageUrl={encodeURI(import.meta.env.VITE_APP_CONTENT + "/" + sdocData.data.repo_url)}
              x={annotation.x_min}
              y={annotation.y_min}
              width={annotation.x_max - annotation.x_min}
              targetWidth={((annotation.x_max - annotation.x_min) * 100) / (annotation.y_max - annotation.y_min)}
              height={annotation.y_max - annotation.y_min}
              targetHeight={100}
              style={{
                border: "4px solid " + code.data.color,
              }}
            />
          ) : (
            <CircularProgress />
          )}
          <Stack direction="row" justifyContent="end" width="100%">
            <Typography variant="subtitle2" color="textDisabled" fontSize={12}>
              <UserName userId={annotation.user_id} />
            </Typography>
          </Stack>
        </CardContent>
      </CardActionArea>
      {isSelected && code.isSuccess && (
        <>
          <Divider />
          <AnnotationCardMemo
            annotationId={annotation.id}
            annotationType={AttachedObjectType.BBOX_ANNOTATION}
            annotationText="Image"
            codeName={code.data.name}
          />
        </>
      )}
    </Card>
  );
}

export default BBoxAnnotationCard;
