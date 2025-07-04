import { CircularProgress, Stack, Typography } from "@mui/material";

export default function Loading() {
	return (
		<Stack
			spacing={4}
			sx={{ display: "flex", alignItems: "center", flexDirection: "column" }}>
			<CircularProgress size={100} />
			<Typography variant="h5">Loading...</Typography>
		</Stack>
	);
}
