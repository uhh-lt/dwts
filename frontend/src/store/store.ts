import { Action, ThunkAction, configureStore } from "@reduxjs/toolkit";
import { FLUSH, PAUSE, PERSIST, PURGE, REGISTER, REHYDRATE } from "redux-persist";
import bboxFilterReducer from "../components/BBoxAnnotation/BBoxAnnotationTable/bboxFilterSlice.ts";
import memoFilterReducer from "../components/Memo/MemoTable/memoFilterSlice.ts";
import projectReducer from "../components/Project/projectSlice.ts";
import seatFilterReducer from "../components/SentenceAnnotation/SentenceAnnotationTable/seatFilterSlice.ts";
import documentTableFilterReducer from "../components/SourceDocument/SdocTable/documentTableFilterSlice.ts";
import satFilterReducer from "../components/SpanAnnotation/SpanAnnotationTable/satFilterSlice.ts";
import dialogReducer from "../components/dialogSlice.ts";
import layoutReducer from "../layouts/layoutSlice.ts";
import cotaReducer from "../views/analysis/ConceptsOverTime/cotaSlice.ts";
import sentAnnotationAnalysisReducer from "../views/analysis/SentAnnotationAnalysis/sentAnnotationAnalysisSlice.ts";
import spanAnnotationAnalysisReducer from "../views/analysis/SpanAnnotationAnalysis/spanAnnotationAnalysisSlice.ts";
import timelineAnalysisReducer from "../views/analysis/TimelineAnalysis/timelineAnalysisSlice.ts";
import wordFrequencyReducer from "../views/analysis/WordFrequency/wordFrequencySlice.ts";
import annoReducer from "../views/annotation/annoSlice.ts";
import logbookReducer from "../views/logbook/logbookSlice.ts";
import searchReducer from "../views/search/DocumentSearch/searchSlice.ts";
import imageSearchReducer from "../views/search/ImageSearch/imageSearchSlice.ts";
import sentenceSearchReducer from "../views/search/SentenceSearch/sentenceSearchSlice.ts";
import documentSamplerReducer from "../views/tools/DocumentSampler/documentSamplerSlice.ts";

export const store = configureStore({
  reducer: {
    // persited reducers
    annotations: annoReducer,
    search: searchReducer,
    imageSearch: imageSearchReducer,
    sentenceSearch: sentenceSearchReducer,
    layout: layoutReducer,
    project: projectReducer,
    // non-persisted reducers
    logbook: logbookReducer,
    spanAnnotationAnalysis: spanAnnotationAnalysisReducer,
    sentAnnotationAnalysis: sentAnnotationAnalysisReducer,
    timelineAnalysis: timelineAnalysisReducer,
    satFilter: satFilterReducer,
    seatFilter: seatFilterReducer,
    bboxFilter: bboxFilterReducer,
    memoFilter: memoFilterReducer,
    documentTableFilter: documentTableFilterReducer,
    wordFrequency: wordFrequencyReducer,
    cota: cotaReducer,
    dialog: dialogReducer,
    documentSampler: documentSamplerReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, RootState, unknown, Action<string>>;
