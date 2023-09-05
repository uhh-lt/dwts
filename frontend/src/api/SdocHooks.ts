import { useMutation, useQueries, useQuery } from "@tanstack/react-query";

import {
  AnnotationDocumentRead,
  AnnotationDocumentService,
  DocType,
  DocumentTagRead,
  DocumentTagService,
  MemoRead,
  MetadataService,
  ProjectService,
  SourceDocumentContent,
  SourceDocumentKeywords,
  SourceDocumentMetadataRead,
  SourceDocumentRead,
  SourceDocumentSentences,
  SourceDocumentService,
  SourceDocumentTokens,
} from "./openapi";
import { QueryKey } from "./QueryKey";
import useStableQueries from "../utils/useStableQueries";
import queryClient from "../plugins/ReactQueryClient";

// sdoc
const fetchSdoc = async (sdocId: number) => {
  const sdoc = await SourceDocumentService.getById({
    sdocId: sdocId!,
  });

  const name = await SourceDocumentService.readMetadataByKey({ sdocId: sdocId, metadataKey: "name" });
  sdoc.filename = name.value;

  switch (sdoc.doctype) {
    case DocType.TEXT:
      const x = await SourceDocumentService.getHtml({ sdocId: sdocId, onlyFinished: true });
      sdoc.content = x.html;
      break;
    case DocType.IMAGE:
      let url = await SourceDocumentService.getFileUrl({ sdocId: sdocId, webp: true });
      sdoc.content = encodeURI(process.env.REACT_APP_CONTENT + "/" + url);
      break;
    case DocType.VIDEO:
    case DocType.AUDIO:
      let url2 = await SourceDocumentService.getFileUrl({ sdocId: sdocId });
      sdoc.content = encodeURI(process.env.REACT_APP_CONTENT + "/" + url2);
      break;
  }

  return sdoc;
};

const useGetDocumentNoContent = (sdocId: number | undefined) =>
  useQuery<SourceDocumentRead, Error>(
    [QueryKey.SDOC_NO_CONTENT, sdocId],
    async () => {
      const sdoc = await SourceDocumentService.getById({
        sdocId: sdocId!,
      });

      const name = await SourceDocumentService.readMetadataByKey({ sdocId: sdocId!, metadataKey: "name" });
      sdoc.filename = name.value;

      return sdoc;
    },
    {
      enabled: !!sdocId,
    }
  );

const useGetDocument = (sdocId: number | undefined) =>
  useQuery<SourceDocumentRead, Error>([QueryKey.SDOC, sdocId], () => fetchSdoc(sdocId!), {
    enabled: !!sdocId,
  });

const useGetDocumentIdByFilename = (filename: string | undefined, projectId: number) =>
  useQuery<number | undefined, Error>(
    [QueryKey.SDOC_ID, projectId, filename],
    () =>
      ProjectService.resolveFilename({
        projId: projectId,
        filename: filename!,
        onlyFinished: true,
      }),
    {
      enabled: !!filename,
      staleTime: Infinity,
    }
  );

const useGetDocumentByAdocId = (adocId: number | undefined) =>
  useQuery<SourceDocumentRead, Error>(
    [QueryKey.SDOC_BY_ADOC, adocId],
    async () => {
      const adoc = await AnnotationDocumentService.getByAdocId({ adocId: adocId! });
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
      SourceDocumentService.getTokens({
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
      SourceDocumentService.getKeywords({
        sdocId: sdocId!,
      }),
    {
      enabled: !!sdocId,
    }
  );

const useUpdateDocumentKeywords = () =>
  useMutation(SourceDocumentService.updateKeywords, {
    onSuccess: (sdoc) => {
      queryClient.invalidateQueries([QueryKey.SDOC_KEYWORDS, sdoc.source_document_id]);
    },
  });

const useGetDocumentSentences = (sdocId: number | undefined) =>
  useQuery<SourceDocumentSentences, Error>(
    [QueryKey.SDOC_SENTENCES, sdocId],
    () =>
      SourceDocumentService.getSentences({
        sdocId: sdocId!,
      }),
    {
      enabled: !!sdocId,
    }
  );

const useGetDocumentContent = (sdocId: number | undefined) =>
  useQuery<SourceDocumentContent, Error>(
    [QueryKey.SDOC_CONTENT, sdocId],
    () =>
      SourceDocumentService.getContent({
        sdocId: sdocId!,
      }),
    {
      enabled: !!sdocId,
    }
  );

const useGetLinkedSdocIds = (sdocId: number | undefined) =>
  useQuery<number[], Error>(
    [QueryKey.SDOC_LINKS, sdocId],
    () =>
      SourceDocumentService.getLinkedSdocs({
        sdocId: sdocId!,
      }),
    {
      enabled: !!sdocId,
    }
  );

const useDeleteDocument = () =>
  useMutation(SourceDocumentService.deleteById, {
    onSuccess: (sdoc) => {
      queryClient.invalidateQueries([QueryKey.PROJECT_SDOCS, sdoc.project_id]);
      queryClient.invalidateQueries([QueryKey.PROJECT_SDOCS_INFINITE, sdoc.project_id]);
      queryClient.invalidateQueries([QueryKey.SDOCS_BY_PROJECT_AND_FILTERS_SEARCH, sdoc.project_id]);
      queryClient.invalidateQueries([QueryKey.SDOCS_BY_PROJECT_AND_TAG_SEARCH, sdoc.project_id]);
    },
  });

const useDeleteDocuments = () =>
  useMutation(
    ({ sdocIds }: { sdocIds: number[] }) => {
      const promises = sdocIds.map((sdocId) => SourceDocumentService.deleteById({ sdocId: sdocId }));
      return Promise.all(promises);
    },
    {
      onSuccess: (sdocs) => {
        sdocs.forEach((sdoc) => {
          queryClient.invalidateQueries([QueryKey.PROJECT_SDOCS, sdoc.project_id]);
          queryClient.invalidateQueries([QueryKey.PROJECT_SDOCS_INFINITE, sdoc.project_id]);
          queryClient.invalidateQueries([QueryKey.SDOCS_BY_PROJECT_AND_FILTERS_SEARCH, sdoc.project_id]);
          queryClient.invalidateQueries([QueryKey.SDOCS_BY_PROJECT_AND_TAG_SEARCH, sdoc.project_id]);
        });
      },
    }
  );

// tags
const useGetByTagId = (tagId: number | undefined) =>
  useQuery<SourceDocumentRead[], Error>(
    [QueryKey.SDOCS_BY_TAG_ID, tagId],
    () =>
      DocumentTagService.getSdocsByTagId({
        tagId: tagId!,
      }),
    {
      enabled: !!tagId,
    }
  );

const useGetAllDocumentTags = (sdocId: number | undefined) =>
  useQuery<DocumentTagRead[], Error>(
    [QueryKey.SDOC_TAGS, sdocId],
    () =>
      SourceDocumentService.getAllTags({
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
          SourceDocumentService.getAllTags({
            sdocId: sdocId,
          }),
      })),
    })
  );

const useRemoveDocumentTag = () =>
  useMutation(SourceDocumentService.unlinkTag, {
    onSuccess: (sdoc) => {
      queryClient.invalidateQueries([QueryKey.SDOC_TAGS, sdoc.id]);
      queryClient.invalidateQueries([QueryKey.SDOCS_BY_PROJECT_AND_FILTERS_SEARCH, sdoc.project_id]);
    },
  });

// adoc
const useGetAllAnnotationDocuments = (sdocId: number | undefined) => {
  return useQuery<AnnotationDocumentRead[], Error>(
    [QueryKey.SDOC_ADOCS, sdocId],
    () =>
      SourceDocumentService.getAllAdocs({
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
      SourceDocumentService.getMemos({
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
      SourceDocumentService.getUserMemos({
        sdocId: sdocId!,
        userId: userId!,
      }).then((memos) => memos[0]),
    {
      retry: false,
      enabled: !!sdocId && !!userId,
    }
  );

const useGetRelatedMemos = (sdocId: number | undefined, userId: number | undefined) =>
  useQuery<MemoRead[], Error>(
    [QueryKey.MEMO_SDOC_RELATED, userId, sdocId],
    () =>
      SourceDocumentService.getRelatedUserMemos({
        sdocId: sdocId!,
        userId: userId!,
      }),
    {
      retry: false,
      enabled: !!sdocId && !!userId,
    }
  );

const useCreateMemo = () =>
  useMutation(SourceDocumentService.addMemo, {
    onSuccess: (memo) => {
      queryClient.invalidateQueries([QueryKey.USER_MEMOS, memo.user_id]);
      queryClient.invalidateQueries([QueryKey.MEMO_SDOC, memo.attached_object_id, memo.user_id]);
      queryClient.invalidateQueries([QueryKey.MEMO_SDOC_RELATED, memo.user_id, memo.attached_object_id]);
    },
  });

// name
const useGetName = (sdocId: number | undefined) =>
  useQuery<SourceDocumentMetadataRead, Error>(
    [QueryKey.SDOC_NAME, sdocId],
    async () => SourceDocumentService.readMetadataByKey({ sdocId: sdocId!, metadataKey: "name" }),
    {
      enabled: !!sdocId,
    }
  );

const useUpdateName = () =>
  useMutation(MetadataService.updateById, {
    onSuccess: (metadata) => {
      queryClient.invalidateQueries([QueryKey.SDOC, metadata.source_document_id]);
      queryClient.setQueryData([QueryKey.SDOC_NAME, metadata.source_document_id], metadata);
    },
  });

// metadata
const useGetURL = (sdocId: number | undefined, webp: boolean = false) =>
  useQuery<string, Error>(
    [QueryKey.SDOC_URL, sdocId],
    () => SourceDocumentService.getFileUrl({ sdocId: sdocId!, relative: true, webp: webp }),
    {
      enabled: !!sdocId,
      select: (url) => encodeURI(process.env.REACT_APP_CONTENT + "/" + url),
    }
  );

const useGetThumbnailURL = (sdocId: number | undefined) =>
  useQuery<string, Error>(
    [QueryKey.SDOC_THUMBNAIL_URL, sdocId],
    () => SourceDocumentService.getFileUrl({ sdocId: sdocId!, relative: true, webp: true, thumbnail: true }),
    {
      enabled: !!sdocId,
      select: (thumbnail_url) => encodeURI(process.env.REACT_APP_CONTENT + "/" + thumbnail_url),
    }
  );

const useGetMetadata = (sdocId: number | undefined) =>
  useQuery<Map<string, SourceDocumentMetadataRead>, Error>(
    [QueryKey.SDOC_METADATAS, sdocId],
    async () => {
      const metadatas = await SourceDocumentService.getAllMetadata({
        sdocId: sdocId!,
        excludeCsv: "word_level_transcriptions,word_frequencies,name",
      });
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

const useGetWordFrequencies = (sdocId: number | undefined) =>
  useQuery<SourceDocumentMetadataRead, Error>(
    [QueryKey.SDOC_WORD_FREQUENCIES, sdocId],
    () => SourceDocumentService.readMetadataByKey({ sdocId: sdocId!, metadataKey: "word_frequencies" }),
    {
      enabled: !!sdocId,
    }
  );

interface WordLevelTranscription {
  text: string;
  start_ms: number;
  end_ms: number;
}

const useGetWordLevelTranscriptions = (sdocId: number | undefined) =>
  useQuery<WordLevelTranscription[], Error>(
    [QueryKey.SDOC_WORD_LEVEL_TRANSCRIPTIONS, sdocId],
    async () => {
      const metadata = await SourceDocumentService.readMetadataByKey({
        sdocId: sdocId!,
        metadataKey: "word_level_transcriptions",
      });
      return JSON.parse(metadata.value) as WordLevelTranscription[];
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
  useUpdateDocumentKeywords,
  useGetDocumentSentences,
  useGetDocumentContent,
  useGetLinkedSdocIds,
  useDeleteDocument,
  useDeleteDocuments,
  useGetDocumentIdByFilename,
  // tags
  useGetByTagId,
  useGetAllDocumentTags,
  useGetAllDocumentTagsBatch,
  useRemoveDocumentTag,
  // adoc
  useGetAllAnnotationDocuments,
  // memo
  useGetMemos,
  useGetMemo,
  useGetRelatedMemos,
  useCreateMemo,
  // name
  useGetName,
  useUpdateName,
  // metadata
  useGetURL,
  useGetThumbnailURL,
  useGetMetadata,
  useGetWordFrequencies,
  useGetWordLevelTranscriptions,
};

export default SdocHooks;
