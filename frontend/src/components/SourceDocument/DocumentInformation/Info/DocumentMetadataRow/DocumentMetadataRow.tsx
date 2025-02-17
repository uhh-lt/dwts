import { ErrorMessage } from "@hookform/error-message";
import { Stack } from "@mui/material";
import { useCallback } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import MetadataHooks from "../../../../../api/MetadataHooks.ts";

import { MetaType } from "../../../../../api/openapi/models/MetaType.ts";
import { ProjectMetadataRead } from "../../../../../api/openapi/models/ProjectMetadataRead.ts";
import { SourceDocumentMetadataRead } from "../../../../../api/openapi/models/SourceDocumentMetadataRead.ts";
import { SourceDocumentMetadataUpdate } from "../../../../../api/openapi/models/SourceDocumentMetadataUpdate.ts";
import { dateToLocaleYYYYMMDDString } from "../../../../../utils/DateUtils.ts";
import FormChipList from "../../../../FormInputs/FormChipList.tsx";
import FormDate from "../../../../FormInputs/FormDate.tsx";
import FormNumber from "../../../../FormInputs/FormNumber.tsx";
import FormSwitch from "../../../../FormInputs/FormSwitch.tsx";
import FormText from "../../../../FormInputs/FormText.tsx";
import { useOpenSnackbar } from "../../../../SnackbarDialog/useOpenSnackbar.ts";
import MetadataEditMenu from "../MetadataEditMenu.tsx";
import DocumentMetadataAddFilterButton from "./DocumentMetadataAddFilterButton.tsx";
import DocumentMetadataGoToButton from "./DocumentMetadataGoToButton.tsx";
import { isValidHttpUrl } from "./utils.ts";

interface DocumentMetadataRowProps {
  metadata: SourceDocumentMetadataRead;
  filterName?: string;
}

function DocumentMetadataRow({ metadata, filterName }: DocumentMetadataRowProps) {
  const projectMetadata = MetadataHooks.useGetProjectMetadata(metadata.project_metadata_id);
  if (projectMetadata.isSuccess) {
    return (
      <DocumentMetadataRowContent metadata={metadata} projectMetadata={projectMetadata.data} filterName={filterName} />
    );
  }
  return null;
}

function DocumentMetadataRowContent({
  metadata,
  projectMetadata,
  filterName,
}: DocumentMetadataRowProps & { projectMetadata: ProjectMetadataRead }) {
  // use react hook form
  const {
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<SourceDocumentMetadataUpdate>({
    values: {
      str_value: metadata.str_value,
      int_value: metadata.int_value,
      date_value: metadata.date_value ? dateToLocaleYYYYMMDDString(metadata.date_value) : metadata.date_value,
      boolean_value: metadata.boolean_value,
      list_value: metadata.list_value,
    },
  });

  // computed
  const isLink = metadata.str_value ? isValidHttpUrl(metadata.str_value) : false;

  // snackbar
  const openSnackbar = useOpenSnackbar();

  // mutation
  const updateMutation = MetadataHooks.useUpdateSdocMetadata();

  // form handling
  const handleUpdateMetadata: SubmitHandler<SourceDocumentMetadataUpdate> = useCallback(
    (data) => {
      // // only update if data has changed!
      if (
        metadata.str_value !== data.str_value ||
        metadata.int_value !== data.int_value ||
        metadata.date_value !== data.date_value ||
        metadata.boolean_value !== data.boolean_value ||
        metadata.list_value !== data.list_value
      ) {
        const mutation = updateMutation.mutate;
        mutation(
          {
            metadataId: metadata.id,
            requestBody: {
              str_value: data.str_value,
              int_value: data.int_value,
              date_value: data.date_value ? new Date(data.date_value).toISOString() : data.date_value,
              boolean_value: data.boolean_value,
              list_value: data.list_value,
            },
          },
          {
            onSuccess: (metadata: SourceDocumentMetadataRead) => {
              openSnackbar({
                text: `Updated metadata ${metadata.id} for document ${metadata.source_document_id}`,
                severity: "success",
              });
            },
          },
        );
      }
    },
    [metadata, updateMutation.mutate, openSnackbar],
  );
  const handleError: SubmitErrorHandler<SourceDocumentMetadataUpdate> = useCallback((data) => console.error(data), []);

  let inputField: JSX.Element;
  switch (projectMetadata.metatype) {
    case MetaType.STRING:
      inputField = (
        <FormText
          name="str_value"
          control={control}
          textFieldProps={{
            error: Boolean(errors.str_value),
            helperText: <ErrorMessage errors={errors} name="str_value" />,
            variant: "standard",
            disabled: projectMetadata.read_only,
            onBlur: () => handleSubmit(handleUpdateMetadata, handleError)(),
            sx: {
              flexGrow: 1,
              flexBasis: 1,
            },
          }}
        />
      );
      break;
    case MetaType.NUMBER:
      inputField = (
        <FormNumber
          name="int_value"
          control={control}
          textFieldProps={{
            error: Boolean(errors.int_value),
            helperText: <ErrorMessage errors={errors} name="int_value" />,
            variant: "standard",
            disabled: projectMetadata.read_only,
            onBlur: () => handleSubmit(handleUpdateMetadata, handleError)(),
            sx: {
              flexGrow: 1,
              flexBasis: 1,
            },
          }}
        />
      );
      break;
    case MetaType.BOOLEAN:
      inputField = (
        <FormSwitch
          name="boolean_value"
          control={control}
          boxProps={{ sx: { flexGrow: 1, flexBasis: 1 } }}
          switchProps={{ onBlur: () => handleSubmit(handleUpdateMetadata, handleError)() }}
        />
      );
      break;
    case MetaType.DATE:
      inputField = (
        <FormDate
          name="date_value"
          control={control}
          textFieldProps={{
            error: Boolean(errors.date_value),
            helperText: <ErrorMessage errors={errors} name="date_value" />,
            variant: "standard",
            disabled: projectMetadata.read_only,
            onBlur: () => handleSubmit(handleUpdateMetadata, handleError)(),
            sx: {
              flexGrow: 1,
              flexBasis: 1,
            },
          }}
        />
      );
      break;
    case MetaType.LIST:
      inputField = (
        <FormChipList
          name="list_value"
          control={control}
          rules={{ required: true }}
          autoCompleteProps={{
            sx: {
              flexGrow: 1,
              flexBasis: 1,
            },
            disabled: projectMetadata.read_only,
          }}
          textFieldProps={{
            fullWidth: true,
            variant: "standard",
            placeholder: projectMetadata.key,
            onBlur: () => handleSubmit(handleUpdateMetadata, handleError)(),
            error: Boolean(errors.list_value),
            helperText: <ErrorMessage errors={errors} name="list_value" />,
          }}
        />
      );
      break;
  }

  return (
    <Stack direction="row" alignItems="flex-end" mt={1}>
      <MetadataEditMenu projectMetadata={projectMetadata} />
      {inputField}
      {isLink && <DocumentMetadataGoToButton link={metadata.str_value!} size="small" />}
      {filterName && (
        <DocumentMetadataAddFilterButton
          metadata={metadata}
          projectMetadata={projectMetadata}
          filterName={filterName}
          size="small"
        />
      )}
    </Stack>
  );
}

export default DocumentMetadataRow;
