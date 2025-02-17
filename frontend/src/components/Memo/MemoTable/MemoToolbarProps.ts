import { MRT_TableInstance } from "material-react-table";
import { ElasticSearchDocumentHit } from "../../../api/openapi/models/ElasticSearchDocumentHit.ts";

export interface MemoToolbarProps {
  filterName: string;
  table: MRT_TableInstance<ElasticSearchDocumentHit>;
  anchor: React.RefObject<HTMLElement>;
  selectedMemos: ElasticSearchDocumentHit[];
}
