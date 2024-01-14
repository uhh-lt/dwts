import { Card, CardActionArea, CardContent, CardHeader } from "@mui/material";

interface CreateCotaCardProps {
  title: string;
  description: string;
  onClick: () => void;
}

function CreateCotaCard({ title, description, onClick }: CreateCotaCardProps) {
  return (
    <Card
      style={{
        width: "250px",
        height: "calc(100% - 8px)",
        marginRight: "16px",
        display: "inline-block",
        whiteSpace: "normal",
      }}
      variant="outlined"
    >
      <CardActionArea
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
        }}
        onClick={onClick}
      >
        <CardHeader title={title} />
        <CardContent>{description}</CardContent>
      </CardActionArea>
    </Card>
  );
}

export default CreateCotaCard;
