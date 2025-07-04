import {
	Grid,
	Box,
	Button,
	Typography,
	FormControl,
	InputLabel,
	Select,
	FormHelperText,
	MenuItem,
	Stack,
} from "@mui/material";
import CardWithTitle from "../components/CardWithTitle";
import FileUpload from "../components/FileUpload";
import { useCallback, useState } from "react";
import { uploadFile, useDictionaries, useRefreshAnalyze } from "../libs/api";
import { useNavigate } from "react-router";
import Loading from "../components/Loading";
import { Error } from "../components/Error";

export function HomePage() {
	const [file, setFile] = useState<File | null>(null);
	const navigate = useNavigate();
	const { data, isLoading, error, mutate } = useDictionaries();
	const [dictionary, setDictionary] = useState<string>("YAWL");
	const refresh = useRefreshAnalyze();
	const submit = useCallback(() => {
		if (file === null) {
			console.error("No file selected.");
			return;
		}
		if (dictionary === "") {
			console.error("No dictionary selected.");
			return;
		}
		if (!(data?.data?.dictionaries ?? []).includes(dictionary)) {
			console.error(
				"Invalid dictionary selected.",
				dictionary,
				data?.data?.dictionaries
			);
			return;
		}
		uploadFile(file).then((res) => {
			refresh(res.filename, dictionary);
			navigate({
				pathname: `/analyze/${res.filename}`,
				search: new URLSearchParams({ dictionary }).toString(),
			});
		});
	}, [data?.data?.dictionaries, dictionary, file, navigate, refresh]);
	if (isLoading) {
		return <Loading />;
	}
	if (error) {
		return (
			<Error
				error={error}
				retry={() => {
					mutate();
				}}
			/>
		);
	}
	const dictionaries = data!.data.dictionaries;
	return (
		<Box sx={{ flexGrow: 1 }}>
			<Grid container spacing={2}>
				<Grid size={4}>
					<CardWithTitle title="Wordatro Analyzer">
						<Typography>
							Upload a screenshot from Wordatro to analyze its letters.
						</Typography>
					</CardWithTitle>
				</Grid>
				<Grid size={4}>
					<CardWithTitle title="Image Upload">
						<FileUpload
							onChange={(file) => {
								setFile(file);
							}}
							buttonText="Select Image"
							tip="Click or drop to upload an image file."
							accept=".png,.jpg,.jpeg,.bmp"
						/>
					</CardWithTitle>
				</Grid>
				<Grid size={4}>
					<CardWithTitle title="Options & Operations">
						<Stack direction="column" spacing={2} sx={{ alignItems: "start" }}>
							<FormControl fullWidth>
								<InputLabel id="dictionary-select-label">Dictionary</InputLabel>
								<Select
									label="Dictionary"
									labelId="dictionary-select-label"
									id="dictionary-select"
									value={dictionary ?? ""}
									onChange={(e) => {
										setDictionary(e.target.value as string);
									}}>
									{dictionaries.map((dict) => {
										return (
											<MenuItem key={dict} value={dict}>
												{dict}
											</MenuItem>
										);
									})}
								</Select>
								<FormHelperText>
									Select a dictionary for analysis.
								</FormHelperText>
							</FormControl>
							<Button
								onClick={submit}
								disabled={file === null || dictionary === ""}
								variant="contained">
								Start Analyze
							</Button>
						</Stack>
					</CardWithTitle>
				</Grid>
			</Grid>
		</Box>
	);
}
