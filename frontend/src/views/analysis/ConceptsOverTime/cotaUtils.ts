import { COTARead } from "../../../api/openapi";

export const hasConceptsWithDescription = (cota: COTARead) => {
  if (cota.concepts.length === 0) return false;
  return cota.concepts.every((concept) => concept.description.trim().length > 0);
};

export const canAddNewConcept = (cota: COTARead) => {
  // we can only add concepts if the search space is empty
  return cota.search_space.length === 0;
};

export const canDeleteConcept = (cota: COTARead) => {
  // we can only delete concepts if the search space is empty
  return cota.search_space.length === 0;
};

export const canEditConceptDescription = (cota: COTARead) => {
  // we can only edit concepts if the search space is empty
  return cota.search_space.length === 0;
};
