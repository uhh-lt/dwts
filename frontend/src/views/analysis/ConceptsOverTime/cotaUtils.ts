import { COTARead } from "../../../api/openapi";

export const MIN_ANNOTATIONS_PER_CONCEPT = 5;
export const UNANNOTATED_SENTENCE_COLOR = "#8884d8a8";

export const conceptsWithUnsufficientAnnotations = (cota: COTARead) => {
  const conceptId2ConceptName = cota.concepts.reduce(
    (acc, concept) => {
      acc[concept.id] = concept.name;
      return acc;
    },
    {} as Record<string, string>,
  );

  const annotations = countAnnotations(cota);
  const result = [];
  for (const [conceptId, count] of Object.entries(annotations)) {
    if (count < MIN_ANNOTATIONS_PER_CONCEPT) {
      result.push(conceptId2ConceptName[conceptId]);
    }
  }
  return result;
};

export const hasEnoughAnnotations = (cota: COTARead) => {
  const annotations = countAnnotations(cota);
  return Object.values(annotations).every((count) => count >= MIN_ANNOTATIONS_PER_CONCEPT);
};

export const countAnnotations = (cota: COTARead) => {
  // returns a map of concept ids to the number of sentences that were annotated with that concept

  const result = cota.concepts.reduce(
    (acc, concept) => {
      acc[concept.id] = 0;
      return acc;
    },
    {} as Record<string, number>,
  );

  cota.search_space.forEach((sentence) => {
    if (sentence.concept_annotation) {
      result[sentence.concept_annotation] += 1;
    }
  });

  return result;
};

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
