import WebIcon from "@mui/icons-material/Web";
import { Link, List, ListItemButton, ListItemIcon, ListItemText, ListSubheader, Typography } from "@mui/material";
import CrawlerHooks from "../../../../api/CrawlerHooks";
import { CrawlerJobRead } from "../../../../api/openapi";
import { dateToLocaleString } from "../../../../utils/DateUtils";
import BackgroundJobListItem from "./BackgroundJobListItem";

interface CrawlerJobListItemProps {
  initialCrawlerJob: CrawlerJobRead;
}

function CrawlerJobListItem({ initialCrawlerJob }: CrawlerJobListItemProps) {
  // global server state (react-query)
  const crawlerJob = CrawlerHooks.usePollCrawlerJob(initialCrawlerJob.id, initialCrawlerJob);

  const dateString = dateToLocaleString(initialCrawlerJob.created);

  if (crawlerJob.isSuccess) {
    return (
      <BackgroundJobListItem
        jobStatus={crawlerJob.data.status}
        jobId={crawlerJob.data.id}
        title={`Crawler Job: ${crawlerJob.data.id}`}
        subTitle={dateString}
      >
        <List
          component="div"
          disablePadding
          dense
          sx={{ pl: 6 }}
          subheader={<ListSubheader>Downloaded URLs</ListSubheader>}
        >
          {crawlerJob.data.parameters.urls.map((url, index) => (
            <ListItemButton key={index} component={Link} href={url} target="_blank">
              <ListItemIcon>
                <WebIcon />
              </ListItemIcon>
              <ListItemText>
                <Typography variant="body2" color="text.secondary">
                  {url}
                </Typography>
              </ListItemText>
            </ListItemButton>
          ))}
        </List>
      </BackgroundJobListItem>
    );
  } else {
    return null;
  }
}

export default CrawlerJobListItem;
