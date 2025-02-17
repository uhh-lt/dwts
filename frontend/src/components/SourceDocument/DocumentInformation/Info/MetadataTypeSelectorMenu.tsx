import {
  Autocomplete,
  ListItem,
  ListItemIcon,
  ListItemText,
  Popover,
  PopoverPosition,
  TextField,
  UseAutocompleteProps,
  createFilterOptions,
} from "@mui/material";
import { MetaType } from "../../../../api/openapi/models/MetaType.ts";
import { useDebounce } from "../../../../utils/useDebounce.ts";
import { metaTypeToIcon } from "./metaTypeToIcon.tsx";

const filter = createFilterOptions<string>();

interface MetadataTypeSelectorMenuProps {
  placeholder: string;
  position: PopoverPosition | undefined;
  handleClose: () => void;
  handleMenuItemClick: (newType: string) => void;
}

function MetadataTypeSelectorMenu({
  placeholder,
  position,
  handleClose,
  handleMenuItemClick,
}: MetadataTypeSelectorMenuProps) {
  const debouncedPosition = useDebounce(position, 200);

  // filter feature
  const handleChange: UseAutocompleteProps<string, false, false, true>["onChange"] = (event, newValue) => {
    event.stopPropagation();
    if (newValue === null) {
      return;
    }

    handleMenuItemClick(newValue);
    handleClose();
  };

  return (
    <Popover
      open={Boolean(position)}
      onClose={handleClose}
      anchorPosition={position}
      anchorReference="anchorPosition"
      anchorOrigin={{
        vertical: "top",
        horizontal: "left",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "left",
      }}
      elevation={0}
      slotProps={{
        paper: {
          sx: { backgroundColor: "transparent !important", border: "none", p: 0, m: 0 },
        },
      }}
    >
      {Boolean(position) && Boolean(debouncedPosition) && (
        <Autocomplete
          onChange={handleChange}
          filterOptions={filter}
          options={Object.values(MetaType)}
          getOptionLabel={(option) => {
            return option;
          }}
          slotProps={{
            paper: {
              sx: { minHeight: "201px", width: "240px" },
            },
          }}
          renderOption={(props, option) => (
            <ListItem {...props} key={option}>
              <ListItemIcon>{metaTypeToIcon[option as MetaType]}</ListItemIcon>
              <ListItemText>{option}</ListItemText>
            </ListItem>
          )}
          sx={{ width: 240 }}
          renderInput={(params) => (
            <TextField autoFocus placeholder={placeholder} sx={{ bgcolor: "white" }} {...params} />
          )}
          handleHomeEndKeys
          open={true}
          onClose={(_event, reason) => reason === "escape" && handleClose()}
        />
      )}
    </Popover>
  );
}

export default MetadataTypeSelectorMenu;
