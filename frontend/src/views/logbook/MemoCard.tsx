import React, { useMemo } from "react";
import { Card, CardActions, CardContent, CardHeader, IconButton, Tooltip, Typography } from "@mui/material";
import Avatar from "@mui/material/Avatar";
import "./MemoCard.css";
import { MemoColors, MemoNames, MemoShortnames } from "./MemoEnumUtils";
import StarIcon from "@mui/icons-material/Star";
import StarOutlineIcon from "@mui/icons-material/StarOutline";
import EditIcon from "@mui/icons-material/Edit";
import MemoHooks from "../../api/MemoHooks";
import SnackbarAPI from "../../features/snackbar/SnackbarAPI";
import { QueryKey } from "../../api/QueryKey";
import { useQueryClient } from "@tanstack/react-query";
import MemoAPI from "../../features/memo-dialog/MemoAPI";
import useGetMemosAttachedObject from "../../features/memo-dialog/useGetMemosAttachedObject";
import AttachedObjectLink from "./AttachedObjectLink";
import { AttachedObjectType } from "../../api/openapi";

interface MemoCardProps {
  memoId: number;
  filter: string | undefined;
}

function MemoCard({ memoId, filter }: MemoCardProps) {
  // query
  const memo = MemoHooks.useGetMemo(memoId);
  const attachedObject = useGetMemosAttachedObject(memo.data?.attached_object_type)(memo.data?.attached_object_id);

  // computed
  // todo: the filtering should happen in the backend?
  const isFilteredOut = useMemo(() => {
    if (filter === undefined) {
      return false;
    }

    if (!memo.data) {
      return false;
    }

    if (filter === "important") {
      return !memo.data.starred;
    }

    return MemoNames[memo.data.attached_object_type] !== filter;
  }, [memo.data, filter]);

  // mutation
  const queryClient = useQueryClient();
  const updateMutation = MemoHooks.useUpdateMemo({
    onError: (error: Error) => {
      SnackbarAPI.openSnackbar({
        text: error.message,
        severity: "error",
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.MEMO, data.id]);
      SnackbarAPI.openSnackbar({
        text: `Toggled favorite status of memo ${memo.data?.id}`,
        severity: "success",
      });
    },
  });

  // ui events
  const handleOpenMemo = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.stopPropagation();
    if (memo.data) {
      MemoAPI.openMemo({ memoId });
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    updateMutation.mutate({
      memoId: memo.data!.id,
      requestBody: {
        starred: !memo.data!.starred,
      },
    });
  };

  const handleHoverEnter = () => {
    switch (memo.data?.attached_object_type) {
      case AttachedObjectType.SPAN_ANNOTATION:
        const spans = Array.from(document.getElementsByClassName(`span-${memo.data.attached_object_id}`));
        spans.forEach((element) => {
          element.classList.add("hovered");
        });
        break;
      case AttachedObjectType.BBOX_ANNOTATION:
        const boxes = Array.from(document.getElementsByClassName(`bbox-${memo.data.attached_object_id}`));
        boxes.forEach((element) => {
          element.classList.add("hovered");
        });
        break;
    }
  };

  const handleHoverLeave = () => {
    const elements = Array.from(document.getElementsByClassName(`hovered`));
    elements.forEach((element) => {
      element.classList.remove("hovered");
    });
  };

  // rendering
  return (
    <>
      {isFilteredOut ? null : (
        <Card
          variant="outlined"
          className="myMemoCard"
          onMouseEnter={() => handleHoverEnter()}
          onMouseLeave={() => handleHoverLeave()}
        >
          {memo.isSuccess && attachedObject.isSuccess ? (
            <>
              <CardHeader
                avatar={
                  <Avatar sx={{ width: 32, height: 32, bgcolor: MemoColors[memo.data.attached_object_type] }}>
                    {MemoShortnames[memo.data.attached_object_type]}
                  </Avatar>
                }
                action={
                  <Tooltip title={memo.data.starred ? "Marked" : "Not marked"}>
                    <span>
                      <IconButton onClick={handleClick} disabled={updateMutation.isLoading}>
                        {memo.data.starred ? <StarIcon /> : <StarOutlineIcon />}
                      </IconButton>
                    </span>
                  </Tooltip>
                }
                title={memo.data.title}
                sx={{ pb: 0, pt: 1 }}
                titleTypographyProps={{
                  variant: "h5",
                }}
              />
              <CardContent sx={{ py: 0, my: 1, maxHeight: 300, overflowY: "hidden" }}>
                <Typography sx={{ mb: 1.5 }} color="text.secondary">
                  <AttachedObjectLink
                    attachedObject={attachedObject.data}
                    attachedObjectType={memo.data.attached_object_type}
                  />
                </Typography>
                <Typography variant="body1">{memo.data.content}</Typography>
              </CardContent>
              <CardActions sx={{ px: 0.5, pt: 0, pb: 0.5 }}>
                <Tooltip title={"Edit memo"}>
                  <span>
                    <IconButton aria-label="settings" onClick={handleOpenMemo} size="small">
                      <EditIcon fontSize="inherit" />
                    </IconButton>
                  </span>
                </Tooltip>
              </CardActions>
            </>
          ) : memo.isError ? (
            <CardHeader
              title={`Error: ${memo.error.message}`}
              sx={{ pb: 1, pt: 1 }}
              titleTypographyProps={{
                variant: "h5",
              }}
            />
          ) : (
            <CardHeader
              title="Loading..."
              sx={{ pb: 1, pt: 1 }}
              titleTypographyProps={{
                variant: "h5",
              }}
            />
          )}
        </Card>
      )}
    </>
  );
}

export default MemoCard;
