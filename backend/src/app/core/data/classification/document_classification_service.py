from collections import defaultdict
from typing import List

from loguru import logger

from app.core.data.crud.document_tag import crud_document_tag
from app.core.data.crud.document_tag_recommendation import (
    crud_document_tag_recommendation,
    crud_document_tag_recommendation_link,
)
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.dto.document_tag_recommendation import (
    DocumentTagRecommendationLinkCreate,
    DocumentTagRecommendationLinkUpdate,
    DocumentTagRecommendationSummary,
)
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.db.simsearch_service import SimSearchService
from app.core.db.sql_service import SQLService
from app.util.singleton_meta import SingletonMeta


class DocumentClassificationService(metaclass=SingletonMeta):
    """
    Singleton class for managing document classification jobs.
    This service is responsible for preparing and executing
    classification tasks on source documents and managing the
    associated data.
    """

    def __new__(cls, *args, **kwargs):
        """
        Create a new instance of DocumentClassificationService. If the
        instance already exists, return the existing instance.

        Returns:
            DocumentClassificationService: An instance of the class.
        """
        cls.sqls: SQLService = SQLService()
        cls.sim: SimSearchService = SimSearchService()
        cls.used_model = "Similiarity Search"
        return super(DocumentClassificationService, cls).__new__(cls)

    def classify_untagged_documents(self, task_id: int, project_id: int):
        """
        Classifies untagged documents by suggesting tags based on similar tagged documents.

        For each untagged document (determined by comparing against the IDs of documents that already have tags),
        the method finds similar (tagged) documents and uses their tags as predictions.
        A DocumentTagRecommendationLinkCreate DTO is created for each predicted tag.

        Args:
            task_id (int): The ID of the classification task.
            project_id (int): The project ID to limit the documents and tags.
        """
        dtos = []  # List to hold DTOs to be inserted into the database
        try:
            with self.sqls.db_session() as db:
                # Fetch all documents that already have tags for the given project
                sdocs_with_tags = [
                    SourceDocumentRead.model_validate(sdoc)
                    for sdoc in crud_sdoc.read_all_with_tags(
                        db=db, project_id=project_id
                    )
                ]
            # Extract IDs from the tagged documents
            sdoc_ids = [sdoc.id for sdoc in sdocs_with_tags]

            # Retrieve a mapping: document_id -> list of associated DocumentTagORM objects
            sdocs_and_tags = crud_document_tag.get_tags_for_documents(
                db, sdoc_ids=sdoc_ids
            )

            # Suggest similar documents based on the already tagged documents
            similar_docs = self.sim.suggest_similar_documents(
                proj_id=project_id, sdoc_ids=sdoc_ids, top_k=10
            )

            # Filter out documents that already have tags (i.e. exclude those in sdoc_ids)
            filtered_similar_docs = [
                doc for doc in similar_docs if doc.sdoc_id not in sdoc_ids
            ]

            # Process each similar (untagged) document
            for similar_doc in filtered_similar_docs:
                # Read the untagged document from the database
                sdoc = crud_sdoc.read(db=db, id=similar_doc.sdoc_id)

                # Retrieve the tags from the compared (tagged) document using its ID as key.
                # If no tags are found, skip this similar_doc.
                tags = sdocs_and_tags.get(similar_doc.compared_sdoc_id, None)
                if not tags:
                    continue

                # For each tag associated with the compared (tagged) document, create a prediction.
                for tag in tags:
                    dtos.append(
                        DocumentTagRecommendationLinkCreate(
                            recommendation_task_id=task_id,
                            source_document_id=sdoc.id,
                            predicted_tag_id=tag.id,
                            is_accepted=None,
                            prediction_score=similar_doc.score,
                        )
                    )

            dtos = self._deduplicate_document_classifications(dtos)

            # Insert all generated tag recommendation DTOs into the database at once.
            crud_document_tag_recommendation_link.create_multi(db=db, create_dtos=dtos)
            crud_document_tag_recommendation.set_recommendation_job_model(
                db=db, task_id=task_id, model_name=self.used_model
            )

        except Exception as e:
            logger.error(f"Failed to complete document classification: {e}")

    def get_recommendations_from_task(
        self, task_id: int
    ) -> List[DocumentTagRecommendationSummary]:
        """
        Retrieves and formats unreviewed document tag recommendations based on the given task ID.

        Args:
            task_id (int): The ID of the recommendation task.

        Returns:
            List[DocumentTagRecommendationSummary]: A list of DocumentTagRecommendationSummary DTOs containing recommendation details,
        """
        recommendations_list = []
        try:
            with self.sqls.db_session() as db:
                # Fetch unreviewed document tag recommendations associated with the task ID
                document_tag_recommendations = (
                    crud_document_tag_recommendation_link.read_by_task_id(
                        db=db, task_id=task_id, exclude_reviewed=True
                    )
                )

                # Extract IDs for source documents and predicted tags
                sdoc_ids = [
                    rec.source_document_id for rec in document_tag_recommendations
                ]
                predicted_tag_ids = [
                    rec.predicted_tag_id for rec in document_tag_recommendations
                ]

                # Retrieve the predicted tags and source documents in Batch
                predicted_tags = crud_document_tag.read_by_ids(
                    db=db, ids=predicted_tag_ids
                )
                sdocs = crud_sdoc.read_by_ids(db=db, ids=sdoc_ids)

                # Build dicts to map IDs to objects
                sdocs_dict = {sdoc.id: sdoc for sdoc in sdocs}
                predicted_tags_dict = {tag.id: tag for tag in predicted_tags}

                for rec in document_tag_recommendations:
                    sdoc = sdocs_dict.get(rec.source_document_id)
                    tag = predicted_tags_dict.get(rec.predicted_tag_id)
                    recommendations_list.append(
                        DocumentTagRecommendationSummary(
                            recommendation_id=rec.id,
                            source_document=sdoc.filename if sdoc else None,  # type: ignore
                            predicted_tag_id=rec.predicted_tag_id,
                            predicted_tag=tag.name if tag else None,  # type: ignore
                            prediction_score=rec.prediction_score,
                        )
                    )

        except Exception as e:
            logger.error(f"Error while loading the document tag recommendations: {e}")
        return recommendations_list

    def validate_recommendations(
        self,
        accepted_recommendation_ids: List[int],
        declined_recommendation_ids: List[int],
    ) -> int:
        """
        Validates and accepts/declines document tag recommendations by their IDs.

        This method marks the specified recommendations as accepted and updates the associated
        source documents with the predicted tags. It also returns the number of modifications
        made to the document tags as a result of this operation.

        Args:
            accepted_recommendation_ids (List[int]): A list of recommendation IDs to accept.
            declined_recommendation_ids (List[int]): A list of recommendation IDs to decline.


        Returns:
            int: The number of document tags updated in the database, or -1 if an error occurred.
        """
        accepted_dtos = [
            DocumentTagRecommendationLinkUpdate(is_accepted=True)
            for _ in accepted_recommendation_ids
        ]
        declined_dtos = [
            DocumentTagRecommendationLinkUpdate(is_accepted=False)
            for _ in declined_recommendation_ids
        ]
        try:
            with self.sqls.db_session() as db:
                # Mark recommendations as declined
                crud_document_tag_recommendation_link.update_multi(
                    db=db, ids=declined_recommendation_ids, update_dtos=declined_dtos
                )
                # Mark recommendations as accepted and obtain them
                accepted_recommendations = (
                    crud_document_tag_recommendation_link.update_multi(
                        db=db,
                        ids=accepted_recommendation_ids,
                        update_dtos=accepted_dtos,
                    )
                )

                # Create a map from document IDs to their tags
                document_tags_map = defaultdict(list)
                accepted_sdoc_ids = {
                    rec.source_document_id for rec in accepted_recommendations
                }

                # Directly fetch documents by IDs
                sdocs = crud_sdoc.read_by_ids(db=db, ids=list(accepted_sdoc_ids))

                for sdoc in sdocs:
                    current_tags = {tag.id for tag in sdoc.document_tags}

                    for rec in accepted_recommendations:
                        if rec.source_document_id == sdoc.id:
                            tag_id = rec.predicted_tag_id
                            if tag_id not in current_tags:
                                document_tags_map[sdoc.id].append(tag_id)

                # Update document tags in a batch
                modifications = crud_document_tag.set_document_tags_batch(
                    db=db, links=document_tags_map
                )
                logger.info(
                    f"Document tags updated with {modifications} modifications."
                )
                return modifications + len(declined_recommendation_ids)

        except Exception as e:
            logger.error(f"Error while validating document tag recommendations: {e}")
            return -1

    def _deduplicate_document_classifications(
        self, dtos: List[DocumentTagRecommendationLinkCreate]
    ) -> List[DocumentTagRecommendationLinkCreate]:
        """
        Deduplicates document tag classification recommendations.

        This method is necessary because when documents are compared in vector space,
        multiple documents can have the same tags and neighbors, which can lead to
        duplicate recommendations. This method ensures that only unique recommendations
        are kept by retaining the entry with the highest prediction score for each
        combination of source document and predicted tag.

        Args:
            dtos (List[DocumentTagRecommendationLinkCreate]):
                A list of DocumentTagRecommendationLinkCreate DTOs representing
                the predicted tag classifications for documents.

        Returns:
            List[DocumentTagRecommendationLinkCreate]:
                A list of deduplicated DocumentTagRecommendationLinkCreate DTOs,
                containing only the unique recommendations with the highest prediction scores.
        """
        # Create a dictionary to store the deduplicated entries
        deduplicated_entries = {}

        # Iterate over the dtos and only keep the entry with the highest prediction_score
        for dto in dtos:
            key = (dto.source_document_id, dto.predicted_tag_id)

            # If the key does not exist yet or the current score is higher, store the entry
            if (
                key not in deduplicated_entries
                or dto.prediction_score > deduplicated_entries[key].prediction_score
            ):
                deduplicated_entries[key] = dto

        # The deduplicated entries are now the values of the dictionary
        return list(deduplicated_entries.values())
