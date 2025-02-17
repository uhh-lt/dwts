import { FormControl, InputLabel, ListItemText, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import UserHooks from "../../api/UserHooks.ts";
import UserName from "./UserName.tsx";

interface UserSelectorProps {
  userId: number;
  onUserIdChange: (userIds: number) => void;
  title: string;
}

function UserSelectorSingle({ userId, onUserIdChange, title }: UserSelectorProps) {
  // global server state (react query)
  const projectUsers = UserHooks.useGetAllUsers();

  // handlers (for ui)
  const handleChange = (event: SelectChangeEvent<number>) => {
    onUserIdChange(parseInt(event.target.value as string));
  };

  // render
  return (
    <FormControl sx={{ mx: 1 }}>
      <InputLabel id="user-select-label">{title}</InputLabel>
      <Select
        labelId="user-select-label"
        label={title}
        size="small"
        value={userId}
        onChange={handleChange}
        disabled={!projectUsers.isSuccess}
        renderValue={(userId) => <UserName userId={userId} />}
      >
        {projectUsers.isSuccess &&
          projectUsers.data.map((user) => (
            <MenuItem key={user.id} value={user.id}>
              <ListItemText>
                <UserName userId={user.id} />
              </ListItemText>
            </MenuItem>
          ))}
      </Select>
    </FormControl>
  );
}

export default UserSelectorSingle;
