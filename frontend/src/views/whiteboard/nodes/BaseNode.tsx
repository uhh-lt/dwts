import { Box, CardProps } from "@mui/material";
import React from "react";
import { Handle, NodeResizer, Position } from "reactflow";
import "./nodes.css";
import { useConnectionHelper } from "./useConnectionHelper";

interface BaseNodeProps {
  children: React.ReactNode;
  selected: boolean;
  nodeId: string;
  allowDrawConnection: boolean;
  alignment?: "top" | "center" | "bottom";
}

function BaseNode({ children, selected, nodeId, allowDrawConnection, alignment, ...props }: BaseNodeProps & CardProps) {
  const { isConnecting, isValidConnectionTarget } = useConnectionHelper(nodeId);

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={200}
        minHeight={100}
        handleStyle={{ width: "12px", height: "12px" }}
      />
      <Box padding={2} style={{ height: "100%" }}>
        <Box
          style={{
            height: "100%",
            position: "relative",
          }}
        >
          {!isConnecting && (
            <Handle className="customHandle" position={Position.Right} type="source" style={{ zIndex: 1 }} />
          )}

          <Handle className="customHandle" position={Position.Left} type="target" />

          {!allowDrawConnection && <Box className="customHandle" style={{ zIndex: 5 }} />}

          <Box
            style={{
              position: "relative",
              zIndex: 5,
              margin: "8px",
              borderRadius: "inherit",
              height: "calc(100% - 16px)",
              display: "flex",
              alignItems: alignment === "center" ? "center" : alignment === "bottom" ? "flex-end" : "flex-start",
            }}
          >
            {children}
          </Box>
        </Box>
      </Box>
    </>
  );
}

export default BaseNode;
