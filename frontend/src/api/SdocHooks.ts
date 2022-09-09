import { useMutation, UseMutationOptions, useQueries, useQuery } from "@tanstack/react-query";

import {
  AnnotationDocumentRead,
  AnnotationDocumentService,
  DocType,
  DocumentTagRead,
  MemoCreate,
  MemoRead,
  SourceDocumentKeywords,
  SourceDocumentMetadataRead,
  SourceDocumentRead,
  SourceDocumentService,
  SourceDocumentTokens,
} from "./openapi";
import { QueryKey } from "./QueryKey";
import useStableQueries from "../utils/useStableQueries";

// sdoc
const fetchSdoc = async (sdocId: number) => {
  const sdoc = await SourceDocumentService.getByIdSdocSdocIdGet({
    sdocId: sdocId!,
  });
  switch (sdoc.doctype) {
    case DocType.TEXT:
      const content = await SourceDocumentService.getContentSdocSdocIdContentGet({ sdocId: sdocId });
      sdoc.content = content.content;
      break;
    case DocType.IMAGE:
      const url = await SourceDocumentService.getFileUrlSdocSdocIdUrlGet({ sdocId: sdocId });
      sdoc.content = process.env.REACT_APP_CONTENT + url.split(/:\d+/)[1]; // todo: replace once backend returns relative URL
      break;
  }
  return sdoc;
};

const useGetDocumentNoContent = (sdocId: number | undefined) =>
  useQuery<SourceDocumentRead, Error>(
    [QueryKey.SDOC_NO_CONTENT, sdocId],
    () =>
      SourceDocumentService.getByIdSdocSdocIdGet({
        sdocId: sdocId!,
      }),
    {
      enabled: !!sdocId,
    }
  );

const useGetDocument = (sdocId: number | undefined) =>
  useQuery<SourceDocumentRead, Error>([QueryKey.SDOC, sdocId], () => fetchSdoc(sdocId!), {
    enabled: !!sdocId,
  });

const useGetDocumentByAdocId = (adocId: number | undefined) =>
  useQuery<SourceDocumentRead, Error>(
    [QueryKey.SDOC_BY_ADOC, adocId],
    async () => {
      const adoc = await AnnotationDocumentService.getByAdocIdAdocAdocIdGet({ adocId: adocId! });
      return await fetchSdoc(adoc.source_document_id);
    },
    {
      enabled: !!adocId,
    }
  );

const useGetDocumentTokens = (sdocId: number | undefined) =>
  useQuery<SourceDocumentTokens, Error>(
    [QueryKey.SDOC_TOKENS, sdocId],
    () =>
      SourceDocumentService.getTokensSdocSdocIdTokensGet({
        sdocId: sdocId!,
        characterOffsets: true,
      }),
    {
      enabled: !!sdocId,
    }
  );

const useGetDocumentKeywords = (sdocId: number | undefined) =>
  useQuery<SourceDocumentKeywords, Error>(
    [QueryKey.SDOC_KEYWORDS, sdocId],
    () =>
      SourceDocumentService.getTokensSdocSdocIdKeywordsGet({
        sdocId: sdocId!,
      }),
    {
      enabled: !!sdocId,
    }
  );

const useDeleteDocument = (options: UseMutationOptions<SourceDocumentRead, Error, { sdocId: number }>) =>
  useMutation(SourceDocumentService.deleteByIdSdocSdocIdDelete, options);

// tags
const useGetAllDocumentTags = (sdocId: number | undefined) =>
  useQuery<DocumentTagRead[], Error>(
    [QueryKey.SDOC_TAGS, sdocId],
    () =>
      SourceDocumentService.getAllTagsSdocSdocIdTagsGet({
        sdocId: sdocId!,
      }),
    {
      enabled: !!sdocId,
    }
  );

const useGetAllDocumentTagsBatch = (sdocIds: number[]) =>
  useStableQueries(
    useQueries({
      queries: sdocIds.map((sdocId) => ({
        queryKey: [QueryKey.SDOC_TAGS, sdocId],
        queryFn: () =>
          SourceDocumentService.getAllTagsSdocSdocIdTagsGet({
            sdocId: sdocId,
          }),
      })),
    })
  );

const useAddDocumentTag = (options: UseMutationOptions<SourceDocumentRead, Error, { sdocId: number; tagId: number }>) =>
  useMutation(SourceDocumentService.linkTagSdocSdocIdTagTagIdPatch, options);

const useRemoveDocumentTag = (
  options: UseMutationOptions<SourceDocumentRead, Error, { sdocId: number; tagId: number }>
) => useMutation(SourceDocumentService.unlinkTagSdocSdocIdTagTagIdDelete, options);

// adoc
const useGetAllAnnotationDocuments = (sdocId: number | undefined) => {
  return useQuery<AnnotationDocumentRead[], Error>(
    [QueryKey.SDOC_ADOCS, sdocId],
    () =>
      SourceDocumentService.getAllAdocsSdocSdocIdAdocGet({
        sdocId: sdocId!,
      }),
    {
      enabled: !!sdocId,
    }
  );
};

// memo
const useGetMemos = (sdocId: number | undefined) =>
  useQuery<MemoRead[], Error>(
    [QueryKey.MEMO_SDOC, sdocId],
    () =>
      SourceDocumentService.getMemosSdocSdocIdMemoGet({
        sdocId: sdocId!,
      }),
    {
      retry: false,
      enabled: !!sdocId,
    }
  );

const useGetMemo = (sdocId: number | undefined, userId: number | undefined) =>
  useQuery<MemoRead, Error>(
    [QueryKey.MEMO_SDOC, sdocId, userId],
    () =>
      SourceDocumentService.getUserMemoSdocSdocIdMemoUserIdGet({
        sdocId: sdocId!,
        userId: userId!,
      }),
    {
      retry: false,
      enabled: !!sdocId && !!userId,
    }
  );

const useCreateMemo = (options: UseMutationOptions<MemoRead, Error, { sdocId: number; requestBody: MemoCreate }>) =>
  useMutation(SourceDocumentService.addMemoSdocSdocIdMemoPut, options);

// metadata
// const useCreateMetadata = (options: UseMutationOptions<MemoRead, Error, { sdocId: number; requestBody: MemoCreate }>) =>
//   useMutation(SourceDocumentService.meta, options);

const useGetURL = (sdocId: number | undefined) =>
  useQuery<string, Error>(
    [QueryKey.SDOC_URL, sdocId],
    () => SourceDocumentService.getFileUrlSdocSdocIdUrlGet({ sdocId: sdocId! }),
    {
      enabled: !!sdocId,
      select: (data) => process.env.REACT_APP_CONTENT + data.split(/:\d+/)[1], // todo: replace once backend returns relative URL
    }
  );

const useGetMetadata = (sdocId: number | undefined) =>
  useQuery<Map<string, SourceDocumentMetadataRead>, Error>(
    [QueryKey.SDOC_METADATAS, sdocId],
    async () => {
      const metadatas = await SourceDocumentService.getAllMetadataSdocSdocIdMetadataGet({ sdocId: sdocId! });
      const result = new Map<string, SourceDocumentMetadataRead>();
      metadatas.forEach((metadata) => {
        result.set(metadata.key, metadata);
      });
      return result;
    },
    {
      enabled: !!sdocId,
    }
  );

const SdocHooks = {
  // sdoc
  useGetDocument,
  useGetDocumentByAdocId,
  useGetDocumentNoContent,
  useGetDocumentTokens,
  useGetDocumentKeywords,
  useDeleteDocument,
  // tags
  useGetAllDocumentTags,
  useGetAllDocumentTagsBatch,
  useAddDocumentTag,
  useRemoveDocumentTag,
  // adoc
  useGetAllAnnotationDocuments,
  // memo
  useGetMemos,
  useGetMemo,
  useCreateMemo,
  // metadata
  useGetURL,
  useGetMetadata,
};

export default SdocHooks;
