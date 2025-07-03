import { Stack, Typography, Button } from "@mui/material";

export function Error({ error, retry }: { error: Error; retry: () => void }) {
	return (
		<Stack gap={2} justifyContent="center" alignItems="center">
			<Typography variant="h2" color="textPrimary">
				Oops......
			</Typography>
			<Typography variant="h5" color="textPrimary">
				Error Occured!
			</Typography>
			<Typography color="textSecondary">{error.message}</Typography>
			<Stack direction="row" gap={2} justifyContent="center">
				<Button variant="contained" onClick={retry}>
					Retry
				</Button>
				<Button
					variant="contained"
					onClick={() => {
						window.history.back();
					}}>
					Go Back
				</Button>
			</Stack>
		</Stack>
	);
}
