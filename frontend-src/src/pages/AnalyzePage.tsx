import { useNavigate, useParams } from "react-router";
import { getUploadedFileUrl, useAnalyze } from "../libs/api";
import { useNotifications } from "@toolpad/core";
import { Box, Button, Grid, Stack } from "@mui/material";
import CardWithTitle from "../components/CardWithTitle";
import { Error } from "../components/Error";

function Loading() {
	return <></>;
}

export function AnalyzePage() {
	const notification = useNotifications();
	const navigate = useNavigate();
	const { filename } = useParams();
	const { data, error, isLoading, mutate } = useAnalyze(filename);
	if (error) {
		console.log(error);
		notification.show(error.message, { severity: "error" });
		return (
			<Error
				error={error}
				retry={() => {
					mutate();
				}}
			/>
		);
	}
	if (isLoading) {
		return <Loading />;
	}
	const res = data!;
	return (
		<Box sx={{ flexGrow: 1 }}>
			<Grid container spacing={2}>
				<Grid size={6}>
					<CardWithTitle title="Original Image">
						<img width="100%" src={getUploadedFileUrl(res.original_image)} />
					</CardWithTitle>
				</Grid>
				<Grid size={12}>
					<CardWithTitle title="Operations">
						<Stack direction="row" spacing={2}>
							<Button
								variant="contained"
								onClick={() => {
									navigate("/");
								}}>
								Back To Home
							</Button>
							<Button
								variant="contained"
								onClick={() => {
									navigate(`/debug/${filename}`);
								}}>
								Inspect Debug Image
							</Button>
						</Stack>
					</CardWithTitle>
				</Grid>
			</Grid>
		</Box>
	);
}
