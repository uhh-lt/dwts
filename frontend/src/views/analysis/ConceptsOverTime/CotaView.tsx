import { CircularProgress, Portal, Typography } from "@mui/material";
import { useContext } from "react";
import { useParams } from "react-router-dom";
import CotaHooks from "../../../api/CotaHooks";
import { AppBarContext } from "../../../layouts/TwoBarLayout";
import CotaViewContent from "./CotaViewContent";

function CotaView() {
  // global client state
  const appBarContainerRef = useContext(AppBarContext);
  const urlParams = useParams() as { projectId: string; cotaId: string };
  const projectId = parseInt(urlParams.projectId);
  const cotaId = parseInt(urlParams.cotaId);

  // global server state
  const cota = CotaHooks.useGetCota(cotaId);

  return (
    <>
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" component="div">
          {cota.data?.name || ""}
        </Typography>
      </Portal>
      {cota.isSuccess ? (
        <CotaViewContent key={`${projectId}-${cotaId}`} cota={cota.data} />
      ) : cota.isLoading ? (
        <CircularProgress />
      ) : cota.isError ? (
        <div>ERROR: {cota.error.message}</div>
      ) : null}
    </>
  );
}

export default CotaView;
