import AccountBoxIcon from "@mui/icons-material/AccountBox";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LogoutIcon from "@mui/icons-material/Logout";
import {
  Card,
  CardContent,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Popover,
  Stack,
  Typography,
} from "@mui/material";
import Avatar from "@mui/material/Avatar";
import React, { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { UserRead } from "../../api/openapi/models/UserRead.ts";

interface UserProfileMenuProps {
  handleLogout: () => void;
  user: UserRead | undefined;
}

function UserProfileMenu({ handleLogout, user }: UserProfileMenuProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? "simple-popover" : undefined;

  if (!user) {
    return <></>;
  }

  return (
    <div>
      <IconButton onClick={handleClick} size="medium">
        <Avatar sx={{ bgcolor: "#2e7d32", border: "1px dashed white" }}>
          {user.first_name.charAt(0).toUpperCase()}
          {user.last_name.charAt(0).toUpperCase()}
        </Avatar>
      </IconButton>
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
      >
        <Card sx={{ minWidth: 275 }}>
          <CardContent>
            <Stack>
              <Typography align="center" variant="h2">
                <AccountCircleIcon fontSize="inherit" />
              </Typography>
              <Typography align="center" variant="h6">
                {user.first_name} {user.last_name}
              </Typography>
              <Typography align="center" variant="body1" style={{ color: "slategrey" }}>
                {user.email}
              </Typography>
            </Stack>
          </CardContent>
          <List disablePadding>
            <ListItem disablePadding>
              <ListItemButton component={RouterLink} to={"/me"}>
                <ListItemIcon>
                  <AccountBoxIcon />
                </ListItemIcon>
                <ListItemText primary="View Profile" />
              </ListItemButton>
            </ListItem>
            <Divider />
            <ListItem disablePadding color="red">
              <ListItemButton onClick={() => handleLogout()} color="error">
                <ListItemIcon>
                  <LogoutIcon />
                </ListItemIcon>
                <ListItemText primary="Logout" />
              </ListItemButton>
            </ListItem>
          </List>
        </Card>
      </Popover>
    </div>
  );
}

export default UserProfileMenu;
