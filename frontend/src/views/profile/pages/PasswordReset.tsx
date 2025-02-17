import { ErrorMessage } from "@hookform/error-message";
import {
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  Stack,
  Typography,
} from "@mui/material";
import { useRef, useState } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import UserHooks from "../../../api/UserHooks.ts";
import FormPassword from "../../../components/FormInputs/FormPassword.tsx";
import { useOpenSnackbar } from "../../../components/SnackbarDialog/useOpenSnackbar.ts";
import { SUPPORT_EMAIL } from "../../../utils/GlobalConstants.ts";

type UpdatePasswordValues = {
  password: string;
  confirmPassword: string;
};

export default function UpdatePassword() {
  const updateUserMutation = UserHooks.useUpdate();
  const {
    handleSubmit,
    formState: { errors },
    watch,
    control,
  } = useForm<UpdatePasswordValues>({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // password
  const password = useRef<string>();
  password.current = watch("password", "");
  const [showPassword, setShowPassword] = useState(false);
  const handleShowPasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setShowPassword(event.target.checked);
  };

  // snack bar
  const openSnackbar = useOpenSnackbar();

  const handleUpdate: SubmitHandler<UpdatePasswordValues> = (data) => {
    updateUserMutation.mutate(
      {
        requestBody: {
          password: data.password,
        },
      },
      {
        onSuccess: () => {
          openSnackbar({
            text: `Hurray! Your password updated successfully.`,
            severity: "success",
          });
        },
        onError: () => {
          openSnackbar({
            text: `Sorry! Your password update failed. Please contact` + { SUPPORT_EMAIL },
            severity: "error",
          });
        },
      },
    );
  };

  const handleError: SubmitErrorHandler<UpdatePasswordValues> = (data) => console.error(data);

  return (
    <form onSubmit={handleSubmit(handleUpdate, handleError)}>
      <Typography variant={"h5"} sx={{ pb: 1 }}>
        Update Password
      </Typography>
      <Divider />
      <Stack direction="row" spacing={2} sx={{ mt: 1, mb: 0.5 }}>
        <FormPassword
          name="password"
          control={control}
          showPassword={showPassword}
          rules={{
            required: "Password is required",
            validate: (value) => {
              return (
                [
                  /[a-z]/, // lowercase
                  /[A-Z]/, // uppercase
                  /[0-9]/, // number
                  /[^a-zA-Z0-9]/, // special character
                ].every((pattern) => pattern.test(value)) ||
                "Password must contain at least one lowercase letter, uppercase letter, number and special character!"
              );
            },
            minLength: {
              value: 8,
              message: "Password too short! (minimum 8 characters)",
            },
          }}
          textFieldProps={{
            label: "Password",
            variant: "outlined",
            fullWidth: true,
            error: Boolean(errors.password),
            helperText: <ErrorMessage errors={errors} name="password" />,
          }}
        />
        <FormPassword
          name="confirmPassword"
          control={control}
          showPassword={showPassword}
          rules={{
            required: "Password is required",
            validate: (value) => value === password.current || "Passwords do not match!",
          }}
          textFieldProps={{
            label: "Password Confirm",
            variant: "outlined",
            fullWidth: true,
            error: Boolean(errors.confirmPassword),
            helperText: <ErrorMessage errors={errors} name="confirmPassword" />,
          }}
        />
      </Stack>
      <FormHelperText sx={{ ml: 1.8 }}>
        Use 8 or more characters with a mix of uppercase letters, lowercase letters, numbers & symbols
      </FormHelperText>
      <FormGroup sx={{ ml: 1 }}>
        <FormControlLabel
          control={<Checkbox value={showPassword} onChange={handleShowPasswordChange} />}
          label="Show Password"
        />
      </FormGroup>
      <Button aria-label="Update Email" variant="contained" type="submit">
        Update
      </Button>
    </form>
  );
}
