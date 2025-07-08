import { useNavigate } from "react-router";
import {
	getUploadedFileUrl,
	useAnalyze,
	type MatchResult,
	type Result,
} from "../libs/api";
import { useDialogs, useNotifications, type DialogProps } from "@toolpad/core";
import {
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Grid,
	Stack,
	Typography,
} from "@mui/material";
import CardWithTitle from "../components/CardWithTitle";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { Error } from "../components/Error";
import Loading from "../components/Loading";
import { useAtomValue } from "jotai/react";
import { fileNameState, optionsState } from "../libs/state";

function PreviewDialog({
	payload,
	open,
	onClose,
}: DialogProps<{
	id: string;
	image: string;
}>) {
	return (
		<Dialog open={open} onClose={() => onClose()}>
			<DialogTitle>Region {payload.id} Preview</DialogTitle>
			<DialogContent>
				<img src={payload.image} alt={`Region ${payload.id} Preview`} />
			</DialogContent>
			<DialogActions>
				<Button onClick={() => onClose()}>Close</Button>
			</DialogActions>
		</Dialog>
	);
}
function MatchResultsDialog({
	payload,
	open,
	onClose,
}: DialogProps<{
	id: string;
	results: MatchResult[];
}>) {
	const resultColumns: GridColDef<MatchResult>[] = [
		{ field: "id", headerName: "Rank", width: 100, type: "number" },
		{
			field: "template",
			headerName: "Template",
			width: 150,
			type: "string",
		},
		{
			field: "letter",
			headerName: "Letter",
			width: 100,
			type: "string",
		},
		{
			field: "score",
			headerName: "Similarity",
			type: "number",
			valueFormatter: (_value, row) => {
				return `${(row.score * 100).toFixed(2)}%`;
			},
		},
	];
	return (
		<Dialog open={open} onClose={() => onClose()} fullWidth>
			<DialogTitle>Region {payload.id} Match Results</DialogTitle>
			<DialogContent>
				<Box sx={{ height: "370px" }}>
					<DataGrid
						disableColumnFilter
						disableColumnMenu
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
						rows={payload.results.map((result, index) => ({
							id: index + 1,
							...result,
						}))}
						columns={resultColumns}
					/>
				</Box>
			</DialogContent>
			<DialogActions>
				<Button onClick={() => onClose()}>Close</Button>
			</DialogActions>
		</Dialog>
	);
}

function RegionCard({ region, name }: { region: Result[]; name: string }) {
	const dialogs = useDialogs();
	const regionColumns: GridColDef<Result>[] = [
		{ field: "id", headerName: "ID", width: 50, type: "string" },
		{
			field: "location",
			headerName: "Location",
			width: 150,
			type: "string",
			valueGetter: (_value, row) => {
				return `x=${row.bbox.x}, y=${row.bbox.y}`;
			},
		},
		{
			field: "size",
			headerName: "Size",
			width: 120,
			type: "string",
			valueGetter: (_value, row) => {
				return `${row.bbox.width} x ${row.bbox.height}`;
			},
		},
		{
			field: "action",
			headerName: "Action",
			flex: 1,
			renderCell: (params) => {
				return (
					<Stack height="100%" direction="row" gap={2} alignItems="center">
						<Button
							variant="text"
							onClick={() => {
								dialogs.open(PreviewDialog, {
									id: params.row.id,
									image: getUploadedFileUrl(params.row.preview),
								});
							}}>
							Preview
						</Button>
						<Button
							variant="text"
							onClick={() => {
								dialogs.open(MatchResultsDialog, {
									id: params.row.id,
									results: params.row.matches,
								});
							}}>
							Matches
						</Button>
					</Stack>
				);
			},
		},
	];
	return (
		<Grid size={6}>
			<CardWithTitle title={`${name} Regions`}>
				<Stack direction="column" gap={2}>
					<Typography>{region.length} regions found.</Typography>
					<Box sx={{ height: "370px" }}>
						<DataGrid
							disableColumnFilter
							disableColumnMenu
							disableColumnResize
							disableColumnSelector
							disableColumnSorting
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
							rows={region}
							columns={regionColumns}
						/>
					</Box>
				</Stack>
			</CardWithTitle>
		</Grid>
	);
}

export function DebugPage() {
	const notification = useNotifications();
	const navigate = useNavigate();
	const options = useAtomValue(optionsState);
	const filename = useAtomValue(fileNameState);
	const { data, error, isLoading, mutate } = useAnalyze(
		filename,
		options.dictionary,
		options.strategy
	);
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
	const res = data!.debug_info;
	return (
		<Box sx={{ flexGrow: 1 }}>
			<Grid container spacing={2}>
				<Grid size={6}>
					<CardWithTitle title="Original Image">
						<img width="100%" src={getUploadedFileUrl(res.original_image)} />
					</CardWithTitle>
				</Grid>
				<Grid size={6}>
					<CardWithTitle title="Region Marked Image">
						<img
							style={{
								maxWidth: "100%",
								height: "auto",
								display: "block",
							}}
							src={getUploadedFileUrl(res.debug_image)}
						/>
						<Box
							sx={{
								display: "flex",
								gap: "20px",
								margin: "15px 0",
								padding: "10px",
								borderRadius: "5px",
							}}>
							<Box display="flex" alignItems="center" gap={0.625}>
								<Box
									display="inline-block"
									width="15px"
									height="15px"
									bgcolor="#f1edbf"
								/>
								<Typography component="span">Regular</Typography>
							</Box>
							<Box display="flex" alignItems="center" gap={0.625}>
								<Box
									display="inline-block"
									width="15px"
									height="15px"
									bgcolor="#baff89"
								/>
								<Typography component="span">Improved</Typography>
							</Box>
							<Box display="flex" alignItems="center" gap={0.625}>
								<Box
									display="inline-block"
									width="15px"
									height="15px"
									bgcolor="#fdd84b"
								/>
								<Typography component="span">Special</Typography>
							</Box>
						</Box>
					</CardWithTitle>
				</Grid>
				<RegionCard region={res.categories.Regular} name="Regular" />
				<RegionCard region={res.categories.Improved} name="Improved" />
				<RegionCard region={res.categories.Special} name="Special" />
				<Grid size={6}>
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
									navigate(`/analyze/${filename}`);
								}}>
								Back To Analyze Page
							</Button>
						</Stack>
					</CardWithTitle>
				</Grid>
			</Grid>
		</Box>
	);
}
