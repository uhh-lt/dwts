export const QueryKey = {
  // all projects
  PROJECTS: "projects",
  // a single project (by project id)
  PROJECT: "project",
  // all users of a project (by project id)
  PROJECT_USERS: "projectUsers",
  // all documents of a project (by project id)
  PROJECT_SDOCS: "projectDocuments",
  // all documents of a project (by project id) for infinite scrolling
  PROJECT_SDOCS_INFINITE: "projectDocumentsInfinite",
  // all codes of a project (by project id)
  PROJECT_CODES: "projectCodes",
  // all entities of a project (by project id)
  PROJECT_ENTITIES: "projectEntities",
  // all tags of a project (by project id)
  PROJECT_TAGS: "projectTags",
  // all crawler jobs of a project (by project id)
  PROJECT_CRAWLER_JOBS: "projectCrawlerJobs",
  // all crawler jobs of a project (by project id)
  PROJECT_PREPROCESSING_JOBS: "projectPreprocessingJobs",

  // all users
  USERS: "users",
  // a single user (by user id)
  USER: "user",
  // all projects of a user (by user id)
  USER_PROJECTS: "userProjects",
  // all codes of a user (by user id)
  USER_CODES: "userCodes",
  // all memos of a user (by user id, by project id)
  USER_MEMOS: "userMemos",
  // all annotation documents of a user (by user id)
  USER_ADOCS: "userAdocs",
  // recently modified adocs of a user (by user id)
  USER_ACTIVITY: "userActivity",

  // a memo (by memo id)
  MEMO: "memo",
  // all memos attached to a code (by code id) or a user's memo (by code id, user id)
  MEMO_CODE: "codeMemo",
  // all memos attached to a tag (by tag id) or a user's memo (by tag id, user id)
  MEMO_TAG: "tagMemo",
  // all memos attached to a document (by document id) or a user's memo (by document id, user id)
  MEMO_SDOC: "sdocMemo",
  // all memos of a user attached to a document and its annotations (span, bbox) (by user id, document id)
  MEMO_SDOC_RELATED: "sdocRelatedMemos",
  // all memos attached to a span (by span id) or a user's memo (by span id, user id)
  MEMO_SPAN_ANNOTATION: "spanAnnotationMemo",
  // all memos attached to a bbox (by bbox id) or a user's memo (by bbox id, user id)
  MEMO_BBOX_ANNOTATION: "bboxAnnotationMemo",
  // all memos attached to a project (by project id) or a user's memo (by project id, user id)
  MEMO_PROJECT: "projectMemo",
  // all memos which content matches the query (by query string)
  MEMOS_BY_CONTENT_SEARCH: "memosByContentSearch",
  // all memos which title matches the query (by query string)
  MEMOS_BY_TITLE_SEARCH: "memosByContentSearch",

  // all actions of a project from a user (by project id, user id)
  ACTION: "action",
  // all actions of a project by query parameters
  ACTIONS_QUERY: "actionsQuery",

  // a single document (by document id)
  SDOC: "sdoc",
  // a single document (by adoc id)
  SDOC_BY_ADOC: "sdocByAdoc",
  // all tags of a document (by document id)
  SDOC_TAGS: "sdocTags",
  // Count how many source documents each tag has
  TAG_SDOC_COUNT: "sdocTagCount",
  // all adocs of a document (by document id)
  SDOC_ADOCS: "sdocAdocs",
  // adoc of a document (by document id, user id)
  SDOC_ADOC_USER: "sdocAdocUser",
  // all metadata of a document (by document id)
  SDOC_METADATAS: "sdocMetadatas",
  // keywords of a document (by document id)
  SDOC_KEYWORDS: "sdocKeywords",
  // word frequencies of a document (by document id)
  SDOC_WORD_FREQUENCIES: "sdocFrequencies",
  // word frequencies of a document (by document id)
  SDOC_WORD_LEVEL_TRANSCRIPTIONS: "sdocTranscriptions",
  // metadata with given key of a document (by document id, metadata key)
  SDOC_METADATA_BY_KEY: "sdocMetadataByKey",
  // url of a document (by document id)
  SDOC_URL: "sdocURL",
  // thumbnail url of a document (by document id)
  SDOC_THUMBNAIL_URL: "sdocThumbnailURL",
  // linked sdoc ids of a document (by document id)
  SDOC_LINKS: "sdocLinks",
  // id of a single SourceDocument (by project id and filename)
  SDOC_ID: "sdocId",
  // all sdocs which are in the project (by project id) and tagged with given tag (by tag id)
  SDOCS_BY_PROJECT_AND_TAG_SEARCH: "sdocsByProjectAndTagSearch",
  // all sdocs which are in the project (by project id) and suffice the given filters (by filter list)
  SDOCS_BY_PROJECT_AND_FILTERS_SEARCH: "searchResults",
  // all sdocs that are tagged with the given tag (by tag id)
  SDOCS_BY_TAG_ID: "sdocsByTagId",
  // the name of a single SourceDocument (by project id and filename)
  SDOC_NAME_BY_PROJECT_AND_FILENAME: "sdocNameByProjectAndFilename",

  // adoc (by adoc id)
  ADOC: "adoc",
  // all spans annotations of a adoc (by adoc id)
  ADOC_SPAN_ANNOTATIONS: "adocSpanAnnotations",
  // all bbox annotations of a adoc (by adoc id)
  ADOC_BBOX_ANNOTATIONS: "adocBboxAnnotations",

  // a single code (by code id)
  CODE: "code",

  // a single entity (by entity id)
  ENTITY: "entity",

  // a single tag (by tag id)
  TAG: "tag",

  // a single span annotation (by span annotation id)
  SPAN_ANNOTATION: "annotation",
  // multiple span annotations (by user id and code id)
  SPAN_ANNOTATIONS_USER_CODE: "annotationsUserCode",
  // a single bbox annotation (by bbox annotation id)
  BBOX_ANNOTATION: "bboxAnnotation",
  // multiple bbox annotations (by user id and code id)
  BBOX_ANNOTATIONS_USER_CODE: "bboxAnnotationsUserCode",

  // project metadata (by project id)
  PROJECT_METADATAS: "projectMetadatas",

  // a single feedback (by feedback id)
  FEEDBACK: "feedback",
  // all feedbacks
  FEEDBACKS: "feedbacks",
  // all user feedbacks (by user id)
  FEEDBACKS_USER: "feedbacksUser",

  // a single TABLE (by TABLE id)
  TABLE: "table",
  // all project, user TABLEs (by user id and project id)
  TABLES_PROJECT_USER: "tablesProjectUser",
  // A single timeline analysis (by id)
  TIMELINE_ANALYSIS: "timelineAnalysis",
  // All analyses from a single user in a given project
  TIMELINE_ANALYSIS_PROJECT_USER: "timelineAnalysisProjectUser",

  // a single COTA (by COTA id)
  COTA: "cota",
  // all project, user COTAs (by user id and project id)
  COTAS_PROJECT_USER: "cotasProjectUser",
  // a single COTARefinementJob (by refinement job id)
  COTA_REFINEMENT_JOB: "cotaRefinementJob",
  // the most recent COTARefinementJob of a cota (by cota id)
  COTA_MOST_RECENT_REFINEMENT_JOB: "cotaMostRecentRefinementJob",

  // a single WHITEBOARD (by WHITEBOARD id)
  WHITEBOARD: "whiteboard",
  // all project WHITEBOARDs (by project id)
  WHITEBOARDS_PROJECT: "whiteboardsProject",

  SEARCH_ENTITY_STATISTICS: "searchEntityStatistics",
  SEARCH_KEYWORD_STATISTICS: "searchKeywordStatistics",
  SEARCH_TAG_STATISTICS: "searchTagStatistics",

  ANALYSIS_CODE_FREQUENCIES: "analysisCodeFrequencies",
  ANALYSIS_CODE_OCCURRENCES: "analysisCodeOccurrences",
  ANALYSIS_ANNOTATION_OCCURRENCES: "analysisAnnotationOccurrences",
  ANALYSIS_ANNOTATED_SEGMENTS: "analysisAnnotatedSegments",
  ANALYSIS_TIMELINE: "anaylsisTimeline",
  ANALYSIS_WORD_FREQUENCY: "analysisWordFrequency",
  ANALYSIS_AGGREGATED_SDOCS_BY_TAGS: "analysisAggregatedSdocsByTags",

  // preprocessing status of the project (by project id)
  PREPRO_PROJECT_STATUS: "preproProjectStatus",

  // preprojob (by prepro job id)
  PREPRO_JOB: "preProJob",

  // export (by export job id)
  EXPORT_JOB: "exportJob",

  // crawler (by crawler job id)
  CRAWLER_JOB: "crawlerJob",

  // tables
  SEARCH_TABLE: "search-document-table-data",
};
