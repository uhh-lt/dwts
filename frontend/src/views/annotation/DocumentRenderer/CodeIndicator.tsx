import CodeHooks from "../../../api/CodeHooks.ts";

interface CodeIndicatorProps {
  codeId: number;
  annotationId: number;
  isSelected?: boolean;
  groups?: number[];
}

function CodeIndicator({ codeId, annotationId, isSelected, groups }: CodeIndicatorProps) {
  const code = CodeHooks.useGetCode(codeId);

  if (code.isSuccess) {
    return (
      <span
        id={"span-annotation-" + annotationId}
        style={{
          backgroundColor: code.data.color,
          ...(isSelected && {
            boxShadow: "0 0 10px 5px " + code.data.color,
            borderRadius: "5px",
          }),
        }}
      >
        {code.data.name}
        {groups && groups.length ? ": " + groups.join(",") : ""}
      </span>
    );
  }
  return (
    <span id={"span-annotation-" + annotationId} style={{ backgroundColor: "lightgray" }}>
      {" "}
      ...
    </span>
  );
}

export default CodeIndicator;
