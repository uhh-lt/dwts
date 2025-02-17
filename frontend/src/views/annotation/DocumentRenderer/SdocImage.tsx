import { useRef } from "react";
import SdocHooks from "../../../api/SdocHooks.ts";
import ImageMenu, { ImageMenuHandle } from "./ImageMenu.tsx";

interface SdocImageLinkProps {
  projectId: number;
  filename: string;
}

function SdocImage({ projectId, filename }: SdocImageLinkProps) {
  const sdocId = SdocHooks.useGetDocumentIdByFilename(filename, projectId);
  const sdocData = SdocHooks.useGetDocumentData(sdocId.data);

  const imageMenuRef = useRef<ImageMenuHandle>(null);

  const openMenu = (event: React.MouseEvent) => {
    if (imageMenuRef.current) {
      const position = {
        left: event.clientX,
        top: event.clientY,
      };
      imageMenuRef.current.open(position, sdocId.data);
    }
  };

  return (
    <>
      {sdocData.isSuccess ? (
        <div>
          <img
            src={encodeURI(import.meta.env.VITE_APP_CONTENT + "/" + sdocData.data.repo_url)}
            alt="resolved"
            style={{ maxWidth: "640px", maxHeight: "480px", cursor: "pointer" }}
            onClick={openMenu}
          />
        </div>
      ) : sdocData.isError ? (
        <div>Error: {sdocData.error.message}</div>
      ) : (
        <div>Loading img...</div>
      )}
      <ImageMenu ref={imageMenuRef} />
    </>
  );
}

export default SdocImage;
