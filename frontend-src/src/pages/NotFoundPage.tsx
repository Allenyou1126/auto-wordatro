import { Stack, Typography, Button } from "@mui/material";
import { redirect } from "react-router";

export function NotFoundPage() {
	return (
		<Stack gap={2} justifyContent="center" alignItems="center">
			<Typography variant="h2" color="textPrimary">
				Oops......
			</Typography>
			<Typography variant="h5" color="textPrimary">
				Page not found!
			</Typography>
			<Stack direction="row" gap={2} justifyContent="center">
				<Button
					variant="contained"
					onClick={() => {
						window.history.back();
					}}>
					Go Back
				</Button>
				<Button
					variant="contained"
					onClick={() => {
						redirect("/");
					}}>
					Go Home
				</Button>
			</Stack>
		</Stack>
	);
}
