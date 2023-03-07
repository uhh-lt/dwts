import React, { useContext, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks";
import "@toast-ui/editor/dist/toastui-editor.css";
import ProjectHooks from "../../api/ProjectHooks";
import { AppBarContext } from "../../layouts/TwoBarLayout";
import { Box, Grid, Portal, Toolbar, Typography } from "@mui/material";
import { ActionRead, ActionTargetObjectType, ActionType } from "../../api/openapi";
import ActionCardWeekView from "./ActionCardWeekView";
import ActionDateFunctions from "./ActionDateFunctions";
import { AutologbookActions, getDateOfISOWeek, getWeekDates } from "./autologbookSlice";
import { ActionFilters } from "./ActionFilters";

const filterAction = (
  action: ActionRead,
  entityIdx: number,
  showCreated: boolean,
  showUpdated: boolean,
  showDeleted: boolean,
  entityFilter: number[] | undefined,
  userFilter: number[]
) => {
  if (action.action_type === ActionType.CREATE) {
    if (!showCreated) {
      return false;
    }
  } else if (action.action_type === ActionType.UPDATE) {
    if (!showUpdated) {
      return false;
    }
  } else {
    if (!showDeleted) {
      return false;
    }
  }
  if (entityFilter !== undefined && !entityFilter.includes(entityIdx)) {
    return false;
  }
  return !(userFilter !== undefined && !userFilter.includes(action.user_id));
};

function Autologbook() {
  const appBarContainerRef = useContext(AppBarContext);

  // global state
  const { user } = useAuth();

  // router
  const { projectId } = useParams() as {
    projectId: string;
  };

  // global state (redux)
  const dispatch = useAppDispatch();
  const year = useAppSelector((state) => state.autologbook.year);
  const week = useAppSelector((state) => state.autologbook.week);
  const showCreated = useAppSelector((state) => state.autologbook.showCreated);
  const showUpdated = useAppSelector((state) => state.autologbook.showUpdated);
  const showDeleted = useAppSelector((state) => state.autologbook.showDeleted);
  const userFilter = useAppSelector((state) => state.autologbook.userFilter);
  const entityFilter = useAppSelector((state) => state.autologbook.entityFilter);

  const userActions = ProjectHooks.useGetActions(parseInt(projectId), user.data!.id);
  const users = ProjectHooks.useGetAllUsers(parseInt(projectId));

  // init user filter selection with all users
  useEffect(() => {
    if (users.data) {
      dispatch(AutologbookActions.setVisibleUserIds(users.data.map((user) => user.id)));
    }
  }, [dispatch, users.data]);

  const selectedWeekDates: () => Date[] = () => {
    let weekStart: Date = getDateOfISOWeek(week, year);
    return getWeekDates(weekStart);
  };

  // Gets the day index of a date in the selected week (or -1 if not in the week)
  const getDayIndexInSelectedWeek: (date: Date, weekArr: Date[]) => number = (date, weekArr) => {
    let weekStart: Date = weekArr[0];
    let weekEnd: Date = weekArr[weekArr.length - 1];
    let dYear = date.getFullYear();
    if (dYear === weekStart.getFullYear() || dYear === weekEnd.getFullYear()) {
      let dMonth = date.getMonth();
      let startMonth = weekStart.getMonth();
      let endMonth = weekEnd.getMonth();
      if (startMonth === endMonth) {
        if (dMonth === endMonth && date.getDate() >= weekStart.getDate() && date.getDate() <= weekEnd.getDate()) {
          return date.getDate() - weekStart.getDate();
        }
      } else {
        if (dMonth === startMonth) {
          if (date.getDate() >= weekStart.getDate()) {
            return date.getDate() - weekStart.getDate();
          }
        } else if (dMonth === endMonth && date.getDate() <= weekEnd.getDate()) {
          return 6 - weekEnd.getDate() - date.getDate();
        }
      }
    }
    return -1;
  };

  const selectedWeek: Date[] = selectedWeekDates();

  const { entityArr, actionsEachDay } = useMemo(() => {
    if (!userActions.data) {
      return { entityArr: undefined, actionsEachDay: undefined };
    }

    let entitySet = new Set<number>();
    let actionsEachDay: ActionRead[][] = [[], [], [], [], [], [], []];

    let entityValues = Object.values(ActionTargetObjectType);
    userActions.data.forEach((action) => {
      let entityIdx = entityValues.indexOf(action.target_type);
      entitySet.add(entityIdx);
      if (!filterAction(action, entityIdx, showCreated, showUpdated, showDeleted, entityFilter, userFilter)) {
        return;
      }
      let date: Date = new Date(action.executed);
      let weekDay: number = getDayIndexInSelectedWeek(date, selectedWeek);
      if (weekDay >= 0) {
        actionsEachDay[weekDay].push(action);
      }
    });
    // remove annotation documents and span groups fully from autologbook
    entitySet.delete(1);
    entitySet.delete(5);

    return { entityArr: Array.from(entitySet).sort(), actionsEachDay };
  }, [userActions.data, entityFilter, showCreated, showUpdated, showDeleted, userFilter, selectedWeek]);

  // effects
  // todo: beschreiben, was macht dieser Effekt?
  useEffect(() => {
    if (entityArr === undefined) return;
    dispatch(AutologbookActions.setVisibleEntityIds(entityArr));
    if (entityFilter === undefined) {
      dispatch(AutologbookActions.setEntityFilter(entityArr));
    }
  }, [entityArr, dispatch, entityFilter]);

  // FIXME: When shrinking the window, the actioncardweekview is not fully scrollable
  return (
    <>
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" color="inherit" component="div">
          Automatic Logbook
        </Typography>
      </Portal>
      {!actionsEachDay && <div>Loading!</div>}
      <div className="myFlexContainer h100">
        <Box className="myFlexFitContent">
          <Toolbar variant="dense" color="secondary">
            <ActionFilters />
            <Box sx={{ flexGrow: 1 }} />
            <ActionDateFunctions weekDays={selectedWeek} />
          </Toolbar>
        </Box>
        <Grid container className="myFlexFillAllContainer" columnSpacing={2}>
          {!!actionsEachDay &&
            actionsEachDay.map((actions, index) => (
              <Grid key={index} item xs={12 / 7} className="h100">
                <ActionCardWeekView actions={actions} day={selectedWeek[index]} />
              </Grid>
            ))}
        </Grid>
      </div>
    </>
  );
}

export default Autologbook;
