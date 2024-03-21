import { AppBar, AppBarProps, Box, Button, Grid, Link, Stack, Toolbar, Typography } from "@mui/material";
import { useContext } from "react";
import { Link as RouterLink, useLocation, useNavigate, useParams } from "react-router-dom";
import ProjectHooks from "../../api/ProjectHooks";
import { LoginStatus, useAuth } from "../../auth/AuthProvider";
import UserProfileMenu from "../../features/UserProfileMenu/UserProfileMenu";
import { AppBarContext } from "../../layouts/TwoBarLayout";
import TemporaryDrawer from "./TemporaryDrawer";
import NavTabs from "../NavTabs/NavTabs";
import { BASE_ROUTE_REGEX } from "../../utils/GlobalConstants";

function TopBar(props: AppBarProps) {
  const { loginStatus, logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const appBarContainerRef = useContext(AppBarContext);

  // global client state (react-router)
  const { projectId } = useParams() as { projectId: string | undefined };

  // global server state (react-query)
  const project = ProjectHooks.useGetProject(projectId ? parseInt(projectId) : undefined);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <>
      <AppBar position="static" sx={{ zIndex: (theme) => theme.zIndex.appBar }} {...props}>
        <Toolbar disableGutters>
          <Grid container spacing={10}>
            <Grid item xs={2} sx={{ pl: 3 }}>
              <Stack direction="row" sx={{ alignItems: "center", height: "100%" }}>
                <TemporaryDrawer />
                <Typography variant="h6" noWrap sx={{ display: { xs: "none", sm: "block" } }}>
                  {loginStatus === LoginStatus.LOGGED_IN ? (
                    <Link href="/projects" color="inherit" underline="none">
                      DWTS
                    </Link>
                  ) : (
                    "DWTS"
                  )}
                </Typography>
              </Stack>
            </Grid>
            <Grid xs={9} item>
              <NavTabs />
            </Grid>
            <Grid item xs={1} sx={{ pl: 0 }}>
              <Stack direction="row" sx={{ alignItems: "center", height: "48px" }}>
                {loginStatus === LoginStatus.LOGGED_OUT ? (
                  <Button color="inherit" component={RouterLink} to="/login">
                    Login
                  </Button>
                ) : (
                  <UserProfileMenu handleLogout={handleLogout} user={user} />
                )}
              </Stack>
            </Grid>
          </Grid>
        </Toolbar>
      </AppBar>
      {location.pathname.match(BASE_ROUTE_REGEX) ? (
        <AppBar
          position="static"
          sx={{
            backgroundColor: "#e3f2fd",
            // backgroundColor: "#DDDDDD",
            // zIndex: (theme) => theme.zIndex.appBar ,
            zIndex: 0,
            color: "inherit",
          }}
          {...props}
        >
          <Toolbar disableGutters>
            <Grid container>
              <Grid item xs={2} sx={{ pl: 3 }}></Grid>

              <Grid item xs={10} sx={{ pr: 3 }}>
                <Stack direction="row" sx={{ alignItems: "center", height: "48px" }}>
                  {appBarContainerRef ? (
                    <Box sx={{ flexGrow: 1 }} ref={appBarContainerRef} />
                  ) : (
                    <Box sx={{ flexGrow: 1 }} />
                  )}
                  {project.isSuccess && (
                    <Typography variant="h6" noWrap sx={{ display: { xs: "none", sm: "block" }, mr: 2 }}>
                      Project: {project.data?.title}
                    </Typography>
                  )}
                </Stack>
              </Grid>
            </Grid>
          </Toolbar>
        </AppBar>
      ) : (
        <></>
      )}
    </>
  );

  // return (
  //   <AppBar position="static" sx={{ zIndex: (theme) => theme.zIndex.appBar }} {...props}>
  //     <Toolbar disableGutters>
  //       <Grid container>
  //         <Grid item xs={2} sx={{ pl: 3 }}>
  //           <Stack direction="row" sx={{ alignItems: "center", height: "100%" }}>
  //             <TemporaryDrawer />
  //             <Typography variant="h6" noWrap sx={{ display: { xs: "none", sm: "block" } }}>
  //               {loginStatus === LoginStatus.LOGGED_IN ? (
  //                 <Link href="/projects" color="inherit" underline="none">
  //                   DWTS
  //                 </Link>
  //               ) : (
  //                 "DWTS"
  //               )}
  //             </Typography>
  //           </Stack>
  //         </Grid>
  //         <Grid item xs={10} sx={{ pr: 3 }}>
  //           <Stack direction="row" sx={{ alignItems: "center", height: "48px" }}>
  //             {appBarContainerRef ? (
  //               <Box sx={{ flexGrow: 1 }} ref={appBarContainerRef} />
  //             ) : (
  //               <Box sx={{ flexGrow: 1 }} />
  //             )}
  //             {project.isSuccess && (
  //               <Typography variant="h6" noWrap sx={{ display: { xs: "none", sm: "block" }, mr: 2 }}>
  //                 Project: {project.data?.title}
  //               </Typography>
  //             )}
  //             {loginStatus === LoginStatus.LOGGED_OUT ? (
  //               <Button color="inherit" component={RouterLink} to="/login">
  //                 Login
  //               </Button>
  //             ) : (
  //               <UserProfileMenu handleLogout={handleLogout} user={user} />
  //             )}
  //           </Stack>
  //         </Grid>
  //       </Grid>
  //     </Toolbar>
  //   </AppBar>
  // );
}

export default TopBar;
