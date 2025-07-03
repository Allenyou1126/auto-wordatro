import { useNavigate, useParams } from "react-router";
import { getUploadedFileUrl, useAnalyze } from "../libs/api";
import { useNotifications } from "@toolpad/core";
import { Box, Button, Grid, Stack } from "@mui/material";
import CardWithTitle from "../components/CardWithTitle";
import { Error } from "../components/Error";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";

function Loading() {
	return <></>;
}

const wordColumns: GridColDef[] = [
	{ field: "id", headerName: "ID", width: 90, type: "number" },
	{ field: "length", headerName: "Length", width: 150, type: "number" },
	{ field: "word", headerName: "Word", width: 250 },
];

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
	const words = Object.keys(res.words)
		.map((key) => {
			const id = parseInt(key);
			if (isNaN(id)) {
				return [];
			}
			return res.words[id].map((word) => {
				return {
					length: id,
					word: word,
				};
			});
		})
		.flat()
		.map((word, index) => ({
			id: index + 1,
			...word,
		}));
	return (
		<Box sx={{ flexGrow: 1 }}>
			<Grid container spacing={2}>
				<Grid size={6}>
					<CardWithTitle title="Original Image">
						<img width="100%" src={getUploadedFileUrl(res.original_image)} />
					</CardWithTitle>
				</Grid>
				<Grid size={6}>
					<CardWithTitle title="Available Words">
						<Box sx={{ height: "370px" }}>
							<DataGrid
								disableColumnResize
								disableColumnSelector
								disableAutosize
								disableRowSelectionOnClick
								disableDensitySelector
								disableMultipleRowSelection
								disableVirtualization
								pageSizeOptions={[5]}
								initialState={{
									pagination: {
										paginationModel: {
											pageSize: 5,
										},
									},
								}}
								rows={words}
								columns={wordColumns}
							/>
						</Box>
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
