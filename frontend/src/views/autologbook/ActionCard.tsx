import * as React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import {
  ActionTargetObjectType,
  ActionType, BBoxAnnotationReadResolvedCode,
  CodeRead,
  DocumentTagRead,
  MemoRead,
  ProjectRead, SourceDocumentRead, SpanAnnotationReadResolved
} from "../../api/openapi";
import UserHooks from "../../api/UserHooks";
import useGetActionCardsActionTarget from "./useGetActionCardsActionTarget";
import { useMemo } from "react";

interface ActionCardProps {
  actionTypeValue: number;
  userId: number;
  targetObjectType: ActionTargetObjectType;
  targetId: number;
  executedAt: string;
}

function ActionCard({ actionTypeValue, userId, targetObjectType, targetId, executedAt }: ActionCardProps) {

  let backgroundColor
  switch (actionTypeValue) {
    case 0:
      backgroundColor = 'rgba(0, 255, 0, 0.2)'
      break;
    case 1:
      backgroundColor = 'rgba(255, 180, 30, 0.2)'
      break;
    case 2:
      backgroundColor = 'rgba(255, 87, 51, 0.2)'
      break;
    default:
      backgroundColor = null
  }

  let readObject;
  const targetObject = useGetActionCardsActionTarget(targetObjectType)(targetId)
  const targetName = useMemo(() => {
    if (!targetObject.data)
      return "Loading"

    switch (targetObjectType) {
      case ActionTargetObjectType.MEMO:
        readObject = targetObject?.data! as MemoRead
        return readObject.title
      case ActionTargetObjectType.PROJECT:
        readObject = targetObject?.data! as ProjectRead
        return readObject.title
      case ActionTargetObjectType.DOCUMENT_TAG:
        readObject = targetObject?.data! as DocumentTagRead
        return readObject.title
      case ActionTargetObjectType.ANNOTATION_DOCUMENT:
        return "Annotation Document"
      case ActionTargetObjectType.SPAN_GROUP:
        return "Span Group does not exist"
      case ActionTargetObjectType.SOURCE_DOCUMENT:
        readObject = targetObject?.data! as SourceDocumentRead
        return readObject.filename
      case ActionTargetObjectType.SPAN_ANNOTATION:
        readObject = targetObject?.data! as SpanAnnotationReadResolved
        return readObject.code.name
      case ActionTargetObjectType.BBOX_ANNOTATION:
        readObject = targetObject?.data! as BBoxAnnotationReadResolvedCode
        return readObject.code.name
      case ActionTargetObjectType.CODE:
      default:
        readObject = targetObject?.data! as CodeRead
        return readObject.name
    }
  }, [targetObject.data])

  const user = UserHooks.useGetUser(userId)?.data;
  let userName: string
  if (!user) {
    userName = userId.toString()
  } else {
    userName = user.first_name + " " + user.last_name;
  }

  return (
    <Card variant="outlined" sx={{ width: '100%', backgroundColor: backgroundColor }}>
      <CardContent>
        <Typography sx={{ fontSize: 12, whiteSpace: 'nowrap' }} color="text.secondary" gutterBottom>
          User: {userName}<span style={{ float: "right" }}>{ActionType[actionTypeValue]}</span>
        </Typography>
        <Typography sx={{ mb: 1.0, mt: 1.5, whiteSpace: 'nowrap' }} variant="h6" component="div">
          {targetObjectType}: {targetName}
        </Typography>
        <Typography variant="body2">
          {executedAt}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default ActionCard;
