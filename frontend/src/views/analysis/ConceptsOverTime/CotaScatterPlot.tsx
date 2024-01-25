import {
  Box,
  Card,
  CardContent,
  CardHeader,
  PopoverPosition,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import React, { useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Dot,
  DotProps,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { COTAConcept, COTARead, COTASentence, COTASentenceID } from "../../../api/openapi";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import CotaPlotToggleButton from "./CotaPlotToggleButton";
import { CotaActions } from "./cotaSlice";
import CircleIcon from "@mui/icons-material/Circle";
import { UNANNOTATED_SENTENCE_COLOR } from "./cotaUtils";
import CotaEditMenu from "./CotaEditMenu";
import CotaHooks from "../../../api/CotaHooks";
import SnackbarAPI from "../../../features/Snackbar/SnackbarAPI";
import { GenericPositionContextMenuHandle } from "../../../components/GenericPositionMenu";

interface CotaScatterPlotProps {
  cota: COTARead;
}

function CotaScatterPlot({ cota }: CotaScatterPlotProps) {
  // local state
  const cotaEditMenuRef = useRef<GenericPositionContextMenuHandle>(null);
  const [rightClickedSentence, setRightClickedSentence] = useState<COTASentenceID | undefined>(undefined);

  // redux
  const dispatch = useAppDispatch();
  const provenanceSdocIdSentenceId = useAppSelector((state) => state.cota.provenanceSdocIdSentenceId);

  // computed
  const { chartData, xDomain, yDomain, conceptId2Concept } = useMemo(() => {
    // 1. compute chart data
    let result: Record<string, COTASentence[]> = {};
    cota.concepts.forEach((concept) => {
      result[concept.id] = [];
    });
    result["NO_CONCEPT"] = [];

    cota.search_space.forEach((cotaSentence) => {
      if (cotaSentence.concept_annotation) {
        result[cotaSentence.concept_annotation].push(cotaSentence);
      } else {
        result["NO_CONCEPT"].push(cotaSentence);
      }
    });

    // 2. compute domain
    const minX = Math.min(...cota.search_space.map((s) => s.x));
    const maxX = Math.max(...cota.search_space.map((s) => s.x));
    const minY = Math.min(...cota.search_space.map((s) => s.y));
    const maxY = Math.max(...cota.search_space.map((s) => s.y));
    const offset = 0.5;

    // 3. compute conceptId2ConceptMap
    const conceptId2Concept: Record<string, COTAConcept> = cota.concepts.reduce(
      (acc, concept) => {
        acc[concept.id] = concept;
        return acc;
      },
      {} as Record<string, COTAConcept>,
    );

    return {
      chartData: result,
      xDomain: [minX - offset, maxX + offset],
      yDomain: [minY - offset, maxY + offset],
      conceptId2Concept,
    };
  }, [cota]);

  // actions
  const handleDotClick = (sdocIdSentenceId: string) => {
    dispatch(CotaActions.onScatterPlotDotClick(sdocIdSentenceId));
  };

  const handleDotContextMenu = (position: PopoverPosition, sentence: COTASentenceID) => {
    cotaEditMenuRef.current?.open(position);
    setRightClickedSentence(sentence);
  };

  const annotateCotaSentences = CotaHooks.useAnnotateCotaSentences();
  const handleAnnotateSentences = (conceptId: string | null) => {
    cotaEditMenuRef.current?.close();
    if (!rightClickedSentence) return;

    annotateCotaSentences.mutate(
      {
        cotaId: cota.id,
        conceptId: conceptId,
        requestBody: [rightClickedSentence],
      },
      {
        onSuccess(data, variables, context) {
          SnackbarAPI.openSnackbar({
            text: `Updated CotA '${data.name}'`,
            severity: "success",
          });
        },
      },
    );
  };

  const removeCotaSentences = CotaHooks.useRemoveCotaSentences();
  const handleRemoveSentences = () => {
    cotaEditMenuRef.current?.close();
    if (!rightClickedSentence) return;

    removeCotaSentences.mutate(
      {
        cotaId: cota.id,
        requestBody: [rightClickedSentence],
      },
      {
        onSuccess(data, variables, context) {
          SnackbarAPI.openSnackbar({
            text: `Updated CotA '${data.name}'`,
            severity: "success",
          });
        },
      },
    );
  };

  // render
  let content: React.ReactNode;
  if (cota.concepts.length === 0) {
    content = (
      <Typography>Please add a concept to start the analysis (or make at least one concept visible).</Typography>
    );
  } else {
    content = (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart
          width={730}
          height={250}
          margin={{
            top: 20,
            right: 20,
            bottom: 10,
            left: 10,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="x" type="number" name="x" domain={xDomain} hide={true} />
          <YAxis dataKey="y" type="number" name="y" domain={yDomain} hide={true} />
          <Tooltip
            content={<CotaScatterPlotTooltip conceptId2Concept={conceptId2Concept} />}
            cursor={{ strokeDasharray: "3 3" }}
          />
          <Legend />
          {cota.concepts.map((concept) => (
            <Scatter
              key={concept.id}
              name={concept.name}
              data={chartData[concept.id]}
              fill={concept.color}
              isAnimationActive={false}
              shape={(props) => (
                <ScatterPlotDot
                  props={props}
                  onClick={handleDotClick}
                  provenanceSdocIdSentenceId={provenanceSdocIdSentenceId}
                  onContextMenu={handleDotContextMenu}
                  radius={5}
                />
              )}
            />
          ))}
          <Scatter
            name="Unannotated Sentences"
            data={chartData["NO_CONCEPT"]}
            fill={UNANNOTATED_SENTENCE_COLOR}
            isAnimationActive={false}
            shape={(props) => (
              <ScatterPlotDot
                props={props}
                onClick={handleDotClick}
                provenanceSdocIdSentenceId={provenanceSdocIdSentenceId}
                onContextMenu={handleDotContextMenu}
                radius={2}
              />
            )}
          />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  return (
    <>
      <Card className="myFlexContainer h100">
        <CardHeader
          className="myFlexFitContentContainer"
          title={"Scatter Plot"}
          subheader={`Hover on a dot to see more information.`}
          action={<CotaPlotToggleButton />}
        />
        <CardContent className="myFlexFillAllContainer">{content}</CardContent>
      </Card>
      <CotaEditMenu
        cota={cota}
        onAnnotateSentences={handleAnnotateSentences}
        onRemoveSentences={handleRemoveSentences}
        ref={cotaEditMenuRef}
      />
    </>
  );
}

interface ScatterPlotDotProps {
  props: any;
  onClick: (sdocIdSentenceId: string) => void;
  provenanceSdocIdSentenceId: string | undefined;
  onContextMenu: (position: PopoverPosition, sentence: COTASentenceID) => void;
  radius: number;
}

function ScatterPlotDot({ props, onClick, provenanceSdocIdSentenceId, onContextMenu, radius }: ScatterPlotDotProps) {
  const sdocIdSentenceId = `${props.sdoc_id}-${props.sentence_id}`;
  const isSelected = sdocIdSentenceId === provenanceSdocIdSentenceId;

  const handleContextMenu = (dot: DotProps, event: React.MouseEvent<SVGCircleElement, MouseEvent>) => {
    event.preventDefault();
    onContextMenu(
      { top: event.clientY, left: event.clientX },
      { sdoc_id: props.sdoc_id, sentence_id: props.sentence_id },
    );
  };
  return (
    <Dot
      cx={props.cx}
      cy={props.cy}
      fill={props.fill}
      key={props.key}
      r={isSelected ? 10 : radius}
      stroke={isSelected ? "black" : undefined}
      strokeWidth={isSelected ? 2 : undefined}
      style={{
        zIndex: isSelected ? 100 : undefined,
      }}
      onClick={() => onClick(sdocIdSentenceId)}
      onContextMenu={handleContextMenu}
    />
  );
}

function CotaScatterPlotTooltip({ active, payload, label, conceptId2Concept }: any) {
  // conceptId2Concept: Record<string, COTAConcept>

  if (active && payload && payload.length && payload.length > 0) {
    const data: COTASentence = payload[0].payload;
    const concept: COTAConcept | undefined = data.concept_annotation
      ? conceptId2Concept[data.concept_annotation]
      : undefined;
    return (
      <Box maxWidth="sm">
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="top" marginBottom={1}>
              <CircleIcon
                fontSize="small"
                style={{ marginRight: "4px", color: concept?.color || UNANNOTATED_SENTENCE_COLOR }}
              />
              <Typography>{data.text}</Typography>
            </Stack>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Concept</TableCell>
                  <TableCell>Similarity</TableCell>
                  <TableCell>Probability</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.values(conceptId2Concept).map((concept: any) => (
                  <TableRow key={concept.id} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                    <TableCell component="th" scope="row" sx={{ color: concept.color }}>
                      {concept.name}
                    </TableCell>
                    <TableCell>{(data.concept_similarities[concept.id] * 100.0).toFixed(2)}</TableCell>
                    <TableCell>{(data.concept_probabilities[concept.id] * 100.0).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return null;
}

export default CotaScatterPlot;
