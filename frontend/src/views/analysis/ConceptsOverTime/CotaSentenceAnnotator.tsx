import BorderColorIcon from "@mui/icons-material/BorderColor";
import InfoIcon from "@mui/icons-material/Info";
import { Box, Button } from "@mui/material";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import IconButton from "@mui/material/IconButton";
import {
  DataGrid,
  GridColDef,
  GridRowSelectionModel,
  GridToolbarColumnsButton,
  GridToolbarContainer,
  GridToolbarDensitySelector,
  GridToolbarExport,
} from "@mui/x-data-grid";
import { useMemo, useState } from "react";
import CotaHooks from "../../../api/CotaHooks";
import { COTAConcept, COTARead, COTASentence } from "../../../api/openapi";
import SdocRenderer from "../../../components/DataGrid/SdocRenderer";
import SdocSentenceRenderer from "../../../components/DataGrid/SdocSentenceRenderer";
import SnackbarAPI from "../../../features/Snackbar/SnackbarAPI";
import { useAppSelector } from "../../../plugins/ReduxHooks";

interface CotaSentenceAnnotatorProps {
  cota: COTARead;
}

function CotaSentenceAnnotator2({ cota }: CotaSentenceAnnotatorProps) {
  // global client state (redux)
  const selectedConceptId = useAppSelector((state) => state.cota.selectedConceptId);

  // computed
  const selectedConcept = useMemo(() => {
    return cota.concepts.find((c) => c.id === selectedConceptId);
  }, [cota, selectedConceptId]);

  return (
    <Card className="myFlexContainer h100">
      <CardHeader
        className="myFlexFitContentContainer"
        action={
          <IconButton aria-label="info">
            <InfoIcon />
          </IconButton>
        }
        title={selectedConcept ? `Similar sentences for concept '${selectedConcept.name}'` : "Similar sentences"}
        subheader="Annotate sentences to improve the timeline analysis"
      />
      <CardContent className="myFlexFillAllContainer" style={{ ...(selectedConcept && { padding: 0 }) }}>
        {!selectedConcept ? (
          <>Select a concept from the concept list to see similar sentences</>
        ) : (
          <SimilarSentencesTable cota={cota} concept={selectedConcept} />
        )}
      </CardContent>
    </Card>
  );
}

interface SimilarSentencesTableProps {
  cota: COTARead;
  concept: COTAConcept;
}

function SimilarSentencesTable({ cota, concept }: SimilarSentencesTableProps) {
  // local state
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>([]);

  // computed
  const columns: GridColDef<COTASentence>[] = useMemo(() => {
    const conceptDict = cota.concepts.reduce(
      (acc, concept) => {
        acc[concept.id] = concept;
        return acc;
      },
      {} as Record<string, COTAConcept>,
    );

    return [
      {
        field: "similarity",
        headerName: "Similarity",
        renderCell: (params) => <>{params.row.concept_similarities[concept.id].toFixed(4)}</>,
        valueGetter: (params) => params.row.concept_similarities[concept.id],
      },
      {
        field: "annotation",
        headerName: "Annotation",
        renderCell: (params) => (
          <Box
            sx={{
              width: 16,
              height: 16,
              backgroundColor: params.row.concept_annotation && conceptDict[params.row.concept_annotation].color,
              borderRadius: "100%",
            }}
          />
        ),
      },
      {
        field: "sdocId",
        headerName: "Document",
        flex: 2,
        renderCell: (params) => <SdocRenderer sdoc={params.row.sdoc_id} link renderFilename />,
      },
      {
        field: "sentenceId",
        headerName: "Sentence",
        flex: 3,
        renderCell: (params) => (
          <SdocSentenceRenderer params={params} sdoc={params.row.sdoc_id} sentenceId={params.row.sentence_id} />
        ),
      },
    ] as GridColDef<COTASentence>[];
  }, [concept.id, cota.concepts]);

  // actions
  const updateCota = CotaHooks.useUpdateCota();
  const handleAnnotateSentences = (sentences: { sentence_id: number; sdoc_id: number }[]) => {
    const searchSpaceDict = cota.search_space.reduce(
      (acc, sentence) => {
        acc[`${sentence.sdoc_id}-${sentence.sentence_id}`] = sentence;
        return acc;
      },
      {} as Record<string, COTASentence>,
    );

    // toggle concept annotation for each checked sentence
    sentences.forEach((sentence) => {
      const sentenceId = `${sentence.sdoc_id}-${sentence.sentence_id}`;
      if (searchSpaceDict[sentenceId].concept_annotation === concept.id) {
        searchSpaceDict[sentenceId].concept_annotation = null;
      } else {
        searchSpaceDict[sentenceId].concept_annotation = concept.id;
      }
    });

    updateCota.mutate(
      {
        cotaId: cota.id,
        requestBody: {
          search_space: Object.values(searchSpaceDict),
        },
      },
      {
        onSuccess(data, variables, context) {
          SnackbarAPI.openSnackbar({
            text: `Updated CotA '${data.name}'`,
            severity: "success",
          });
          setRowSelectionModel([]);
        },
      },
    );
  };

  return (
    <DataGrid
      rows={cota.search_space}
      columns={columns}
      autoPageSize
      getRowId={(row) => `${row.sdoc_id}-${row.sentence_id}`}
      style={{ border: "none" }}
      disableColumnFilter
      // selection
      checkboxSelection
      // disableRowSelectionOnClick
      rowSelectionModel={rowSelectionModel}
      onRowSelectionModelChange={(newSelection) => setRowSelectionModel(newSelection)}
      // custom toolbar
      slots={{
        toolbar: SimilarSentencesToolbar,
      }}
      slotProps={{
        toolbar: {
          selectedRows: rowSelectionModel,
          onAnnotateSentences: handleAnnotateSentences,
        },
      }}
    />
  );
}

interface SimilarSentencesToolbarProps {
  selectedRows: GridRowSelectionModel;
  onAnnotateSentences: (sentences: { sentence_id: number; sdoc_id: number }[]) => void;
}

function SimilarSentencesToolbar({ selectedRows, onAnnotateSentences }: SimilarSentencesToolbarProps) {
  const handleAnnotateSentences = () => {
    onAnnotateSentences(
      selectedRows.map((row) => {
        // row is a string in the format of `${row.sdocId}-${row.sentenceId}`
        const [sdocId, sentenceId] = row.toString().split("-");
        return {
          sentence_id: parseInt(sentenceId),
          sdoc_id: parseInt(sdocId),
        };
      }),
    );
  };

  return (
    <GridToolbarContainer>
      {selectedRows.length > 0 && (
        <Button startIcon={<BorderColorIcon />} size="small" onClick={handleAnnotateSentences}>
          Toggle annotation ({selectedRows.length})
        </Button>
      )}
      <GridToolbarColumnsButton />
      <GridToolbarDensitySelector />
      <GridToolbarExport />
    </GridToolbarContainer>
  );
}

export default CotaSentenceAnnotator2;
