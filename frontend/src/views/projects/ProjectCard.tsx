import { Card, CardActionArea, CardActions, CardContent, CircularProgress, Grid2, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import PreProHooks from "../../api/PreProHooks.ts";
import { ProjectRead } from "../../api/openapi/models/ProjectRead.ts";

interface ProjectCardProps {
  project: ProjectRead;
}
export function ProjectCard({ project }: ProjectCardProps) {
  const preProStatus = PreProHooks.useGetPreProProjectStatus(project.id);
  return (
    <Grid2 size={{ sm: 3 }}>
      <Card>
        <CardActionArea component={Link} to={`/project/${project.id}/search`}>
          <CardContent sx={{ padding: "0px !important" }}>
            <Typography variant="body2" color="textPrimary" bgcolor="lightgray" p={2} height={100}>
              {project.description}
            </Typography>
          </CardContent>
          {preProStatus.isSuccess && (
            <CardContent sx={{ padding: "0px !important" }}>
              <Typography variant="body2" color="textPrimary" bgcolor="lightgray" p={2} height={100}>
                Number of Documents: {preProStatus.data.num_sdocs_finished}
                <br />
                {preProStatus.data.num_active_prepro_job_payloads > 0 && (
                  <>
                    {preProStatus.data.num_active_prepro_job_payloads} Document(s) are preprocessing{" "}
                    <CircularProgress />
                  </>
                )}
              </Typography>
            </CardContent>
          )}
        </CardActionArea>
        <CardActions>
          <Typography
            variant="subtitle1"
            component={Link}
            to={`/project/${project.id}/search`}
            sx={{ flexGrow: 1, textDecoration: "none", color: "inherit" }}
          >
            {project.title}
          </Typography>
        </CardActions>
      </Card>
    </Grid2>
  );
}
