export const QueryKey = {
  // managed by UserHooks
  // all UserRead[] of a Project (by project id)
  PROJECT_USERS: "projectUsers",

  // managed by CodeHooks
  // CodeMap of a Project (by project id)
  PROJECT_CODES: "projectCodes",

  // managed by TagHooks
  // all DocumentTagRead[] of a Project (by project id)
  PROJECT_TAGS: "projectTags",
  // all DocumentTagRead Ids of a SourceDocument (by sdoc id)
  SDOC_TAGS: "sdocTags",
  // Record[docTagId, docTagCount] of SourceDocuments (by sdoc ids)
  TAG_SDOC_COUNT: "sdocTagCount",

  // managed by ProjectHooks
  // all ProjectRead[] of the logged-in user (no parameters)
  USER_PROJECTS: "userProjects",

  // managed by SdocHooks:
  // a single SourceDocumentRead (by sdoc id)
  SDOC: "sdoc",
  // a single SourceDocumentDataRead (by sdoc id)
  SDOC_DATA: "sdocData",
  // id of a single SourceDocument (by project id and filename)
  SDOC_ID: "sdocId",
  // linked sdoc ids of a document (by sdoc id)
  SDOC_LINKS: "sdocLinks",
  // thumbnail url of a document (by sdoc id)
  SDOC_THUMBNAIL_URL: "sdocThumbnailURL",
  // all SourceDocument ids tagged with the given tag (by tag id)
  SDOC_IDS_BY_TAG_ID: "sdocIdsByTagId",
  // annotators (user ids) of a document (by sdoc id)
  SDOC_ANNOTATORS: "sdocAnnotators",

  // managed by MemoHooks:
  // a single MemoRead (by memo id)
  MEMO: "memo",
  // a single MemoRead of the logged in user (by attachedObjectType, attachedObjectId)
  USER_MEMO: "userMemo",
  // all MemoRead[] of the attached object (by attachedObjectType, attachedObjectId)
  OBJECT_MEMOS: "objectMemos",

  // managed by SpanAnnotationHooks:
  // a single SpanAnnotationRead (by span annotation id)
  SPAN_ANNOTATION: "annotation",
  // SpanAnnotationRead[] of a code of the logged-in user (by code id)
  SPAN_ANNOTATIONS_USER_CODE: "annotationsUserCode",
  // SpanAnnotationRead[] (by sdoc id, user id)
  SDOC_SPAN_ANNOTATIONS: "sdocSpanAnnotations",

  // managed by BBoxAnnotationHooks:
  // a single BBoxAnnotationRead (by bbox annotation id)
  BBOX_ANNOTATION: "bboxAnnotation",
  // BBoxAnnotationRead[] of a code of the logged-in user (by code id)
  BBOX_ANNOTATIONS_USER_CODE: "bboxAnnotationsUserCode",
  // BBoxAnnotationRead[] of a document (by sdoc id, user id)
  SDOC_BBOX_ANNOTATIONS: "sdocBBoxAnnotations",

  // managed by SentenceAnnotationHooks:
  // a single SentenceAnnotationRead (by sentence annotation id)
  SENTENCE_ANNOTATION: "sentenceAnnotation",
  // SentenceAnnotator of a document (by sdoc id, user id)
  SDOC_SENTENCE_ANNOTATOR: "sdocSentenceAnnotator",

  // managed by WhiteboardHooks:
  // WhiteboardMap of a project (by project id)
  WHITEBOARDS_PROJECT: "whiteboardsProject",

  // managed by TimelineAnalysisHooks:
  // TimelineMap of a project of the logged-in user (by project id)
  TIMELINE_ANALYSIS_PROJECT_USER: "timelineAnalysisProjectUser",

  // managed by CodeFrequencyHooks:
  // CodeFrequency[] (by project id, user ids, code ids, doc types)
  ANALYSIS_CODE_FREQUENCIES: "analysisCodeFrequencies",
  // CodeOccurrence[] (by project id, user ids, code id)
  ANALYSIS_CODE_OCCURRENCES: "analysisCodeOccurrences",

  // managed by CotaHooks:
  // CotaMap of a project of the logged-in user (by project id)
  COTAS_PROJECT_USER: "cotasProjectUser",
  // the most recent COTARefinementJobRead of a cota (by cota id)
  COTA_MOST_RECENT_REFINEMENT_JOB: "cotaMostRecentRefinementJob",

  // all crawler jobs of a Project (by project id)
  PROJECT_CRAWLER_JOBS: "projectCrawlerJobs",
  // all prepro jobs of a Project (by project id)
  PROJECT_PREPROCESSING_JOBS: "projectPreprocessingJobs",
  // all llm jobs of a Project (by project id)
  PROJECT_LLM_JOBS: "projectLLMJobs",

  // all metadata of a document (by sdoc id)
  SDOC_METADATAS: "sdocMetadatas",
  // metadata with given key of a document (by sdoc id, metadata key)
  SDOC_METADATA_BY_KEY: "sdocMetadataByKey",

  // project metadata (by project id)
  PROJECT_METADATAS: "projectMetadatas",

  // a single feedback (by feedback id)
  FEEDBACK: "feedback",
  // all feedback
  FEEDBACKS: "feedbacks",
  // all logged-in user's feedbacks
  FEEDBACKS_USER: "feedbacksUser",

  // a single TABLE (by TABLE id)
  TABLE: "table",
  // all tables of the project of the logged-in user (by project id)
  TABLES_PROJECT_USER: "tablesProjectUser",

  FILTER_ENTITY_STATISTICS: "filterEntityStatistics",
  FILTER_KEYWORD_STATISTICS: "filterKeywordStatistics",
  FILTER_TAG_STATISTICS: "filterTagStatistics",

  ANNOSCALING_SUGGEST: "annoscalingSuggest",

  // preprocessing status of the project (by project id)
  PREPRO_PROJECT_STATUS: "preproProjectStatus",

  // preprojob (by prepro job id)
  PREPRO_JOB: "preProJob",

  // exportjob (by export job id)
  EXPORT_JOB: "exportJob",

  // crawlerjob (by crawler job id)
  CRAWLER_JOB: "crawlerJob",

  // llmjob (by llm job id)
  LLM_JOB: "llmJob",

  // tables
  SEARCH_TABLE: "search-document-table-data",

  // table info (info about the columns and their types)
  TABLE_INFO: "tableInfo",
};
