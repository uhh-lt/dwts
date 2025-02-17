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
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import { SentenceAnnotationRead } from "../../../api/openapi/models/SentenceAnnotationRead.ts";
import CodeRenderer from "../../../components/Code/CodeRenderer.tsx";
import UserName from "../../../components/User/UserName.tsx";
import AnnotationCardActionsMenu from "./AnnotationCardActionMenu.tsx";
import AnnotationCardMemo from "./AnnotationCardMemo.tsx";
import { AnnotationCardProps } from "./types/AnnotationCardProps.ts";

function SentenceAnnotationCard({
  isSelected,
  annotation,
  onClick,
  cardProps,
}: AnnotationCardProps<SentenceAnnotationRead>) {
  const code = CodeHooks.useGetCode(annotation.code_id);

  return (
    <Card {...cardProps}>
      <CardHeader
        title={<CodeRenderer key={annotation.code_id} code={annotation.code_id} />}
        action={
          <AnnotationCardActionsMenu
            annotationId={annotation.id}
            annotationType={AttachedObjectType.SPAN_ANNOTATION}
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
        <CardContent sx={{ pr: 1, pl: 1.5, pt: 1, pb: "0px !important" }}>
          {code.isSuccess ? (
            <Typography
              variant="body1"
              sx={{
                wordBreak: "break-word",
                borderLeft: "3px solid",
                borderColor: code.data.color,
                pl: 1,
              }}
            >
              This annotation spans sentence {annotation.sentence_id_start + 1} - {annotation.sentence_id_end + 1}.
            </Typography>
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
            annotationType={AttachedObjectType.SPAN_ANNOTATION}
            codeName={code.data.name}
            annotationText={"Sentence"}
          />
        </>
      )}
    </Card>
  );
}

export default SentenceAnnotationCard;
