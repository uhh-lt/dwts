import {
  AppBar, ButtonGroup,
  Checkbox,
  FormControl, IconButton,
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  Toolbar
} from "@mui/material";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks";
import * as React from "react";
import Typography from "@mui/material/Typography";
import UserName from "../../components/UserName";
import { AutologbookActions } from "./autologbookSlice";
import { Add, Edit, Remove } from "@mui/icons-material";
import { ActionTargetObjectType } from "../../api/openapi";
import { useEffect } from "react";
import { useAuth } from "../../auth/AuthProvider";


/**
 * The filter task bar on the top left of the Autologbook viewer.
 * Filter functions are applied in Autologbook.tsx
 */
export function ActionFilters() {

  const { user } = useAuth();

  // global state (redux)
  const dispatch = useAppDispatch();
  const showCreated = useAppSelector((state) => state.autologbook.showCreated);
  const showUpdated = useAppSelector((state) => state.autologbook.showUpdated);
  const showDeleted = useAppSelector((state) => state.autologbook.showDeleted);
  const entityFilter = useAppSelector((state) => state.autologbook.entityFilter);
  const userFilter = useAppSelector((state) => state.autologbook.userFilter);
  const visibleUserIds = useAppSelector((state) => state.autologbook.visibleUserIds);
  const visibleEntityIds = useAppSelector((state) => state.autologbook.visibleEntityIds);

  const entityValueArray = Object.values(ActionTargetObjectType);

  useEffect(() => {
    if (user.data && visibleUserIds === undefined) {
      dispatch(AutologbookActions.setVisibleUserIds([user.data.id]));
    }
  }, [visibleUserIds, dispatch, user.data]);

  const handleUserFilterChange = (event: SelectChangeEvent<number[]>) => {
    if (userFilter !== undefined && visibleUserIds !== undefined) {
      let newFilter: number[] = []
      let selected: number[] = event.target.value as number[]
      let selectedSet: Set<number> = new Set<number>(selected)
      for (let userId of visibleUserIds) {
        if (selectedSet.has(userId)) {
          if (userFilter.has(userId)) {
            newFilter.push(userId)
          }
        } else if (!userFilter.has(userId)) {
          newFilter.push(userId)
        }
      }
      dispatch(AutologbookActions.setUserFilter(newFilter));
    }
  };

  const handleEntityFilterChange = (event: SelectChangeEvent<number[]>) => {
    if (entityFilter !== undefined && visibleEntityIds !== undefined) {
      let newFilter: number[] = []
      let selected: number[] = event.target.value as number[]
      let selectedSet: Set<number> = new Set<number>(selected)
      for (let entityId of visibleEntityIds) {
        if (selectedSet.has(entityId)) {
          if (entityFilter.has(entityId)) {
            newFilter.push(entityId)
          }
        } else if (!entityFilter.has(entityId)) {
          newFilter.push(entityId)
        }
      }
      dispatch(AutologbookActions.setEntityFilter(newFilter));
    }
  };

  // render
  return (
    <Stack direction="row" sx={{ alignItems: "center", backgroundColor: "lightgray", width: "85%" }}>
      <Typography component="div" fontSize={18} style={{ marginLeft: 20, marginRight: 10 }}>
        Filters:
      </Typography>
      <AppBar position="relative" color="secondary">
        <Toolbar variant="dense">
          <FormControl size="small">
            <Stack direction="row" sx={{ alignItems: "center" }}>
              <Typography variant="h6" color="inherit" component="div" style={{ marginRight: "3%" }}>
                Users:
              </Typography>
              <Select
                sx={{ backgroundColor: "white", marginRight: "3%" }}
                multiple
                value={visibleUserIds || []}
                onChange={handleUserFilterChange}
                renderValue={(selected) =>
                  selected.map((x, index) => (
                    <React.Fragment key={x}>
                      <UserName userId={x} />
                      {index < selected.length - 1 && ", "}
                    </React.Fragment>
                  ))
                }
              >
                {visibleUserIds?.map((user) =>
                  <MenuItem key={user} value={user}>
                    <Checkbox checked={userFilter?.has(user)} />
                    <ListItemText>
                      <UserName userId={user} />
                    </ListItemText>
                  </MenuItem>)}
              </Select>
              <Typography variant="h6" color="inherit" component="div" style={{ marginRight: "3%" }}>
                Actions:
              </Typography>
              <ButtonGroup sx={{ backgroundColor: 'white', marginRight: "3%" }}>
                <IconButton children={<Add/>} color={showCreated ? 'primary' : 'default'}
                            onClick={() => dispatch(AutologbookActions.toggleCreated())}/>
                <IconButton children={<Edit/>} color={showUpdated ? 'primary' : 'default'}
                            onClick={() => dispatch(AutologbookActions.toggleUpdated())}/>
                <IconButton children={<Remove/>} color={showDeleted ? 'primary' : 'default'}
                            onClick={() => dispatch(AutologbookActions.toggleDeleted())}/>
              </ButtonGroup>
              <Typography variant="h6" color="inherit" component="div" style={{ marginRight: "3%" }}>
                Entities:
              </Typography>
              <Select
                sx={{ backgroundColor: "white", marginRight: 2 }}
                multiple
                value={visibleEntityIds || []}
                onChange={handleEntityFilterChange}
                renderValue={(selected) => <React.Fragment>{entityValueArray[0]}</React.Fragment>}
              >
                {entityValueArray.map((entity, index) => {
                  let inEntities = visibleEntityIds?.includes(index)
                  return <MenuItem key={index} value={index} disabled={!inEntities}>
                    <Checkbox checked={entityFilter?.has(index)} />
                    <ListItemText>
                      {entity}
                    </ListItemText>
                  </MenuItem>
                })}
              </Select>
            </Stack>
          </FormControl>
        </Toolbar>
      </AppBar>
    </Stack>
  );
}
