import { Box, Card, CardActionArea, CardContent, Container, Grid2, Typography } from "@mui/material";
import { useState } from "react";
import ProjectHooks from "../../api/ProjectHooks.ts";
import { ProjectCard } from "./ProjectCard.tsx";
import ProjectCreationDialog from "./ProjectCreationDialog.tsx";

function Projects() {
  const projects = ProjectHooks.useGetAllProjects();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Box sx={{ height: "100%", overflowY: "auto", pb: 2 }}>
      <Container maxWidth="xl">
        {projects.isLoading && <div>Loading!</div>}
        {projects.isError && <div>Error: {projects.error.message}</div>}
        {projects.isSuccess && (
          <>
            <Grid2 container spacing={2} size={{ sm: 12 }}>
              <Grid2 size={{ sm: 12 }}>
                <Typography variant="h6" mt={2}>
                  All Projects
                </Typography>
              </Grid2>
              <Grid2 size={{ sm: 3 }}>
                <Card
                  sx={{
                    border: "3px dashed lightgray",
                    boxShadow: 0,
                  }}
                >
                  <CardActionArea onClick={() => setIsOpen(true)}>
                    <CardContent
                      sx={{
                        height: 240,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Typography variant="h5" fontWeight={700} color="textSecondary" mb={5}>
                        CREATE NEW PROJECT
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid2>
              {projects.data.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </Grid2>
          </>
        )}
      </Container>
      <ProjectCreationDialog open={isOpen} onClose={() => setIsOpen(false)} />
    </Box>
  );
}

export default Projects;
