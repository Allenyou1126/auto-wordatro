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
import { useCallback, useEffect, useState } from "react";
import {
	uploadFile,
	useDictionaries,
	useRefreshAnalyze,
	useStrategies,
} from "../libs/api";
import { useNavigate } from "react-router";
import Loading from "../components/Loading";
import { Error } from "../components/Error";
import { useAtom, useSetAtom } from "jotai/react";
import { fileNameState, optionsState } from "../libs/state";

export function HomePage() {
	const [file, setFile] = useState<File | null>(null);
	const setFileName = useSetAtom(fileNameState);
	const navigate = useNavigate();
	const {
		data: dictionariesData,
		isLoading: isLoadingDictionaries,
		error: dictionariesError,
		mutate: mutateDictionaries,
	} = useDictionaries();
	const {
		data: strategiesData,
		isLoading: isLoadingStrategies,
		error: strategiesError,
		mutate: mutateStrategies,
	} = useStrategies();
	const [options, setOptions] = useAtom(optionsState);
	const refresh = useRefreshAnalyze();
	const isLoading = isLoadingDictionaries || isLoadingStrategies;
	const error = dictionariesError || strategiesError;
	const submit = useCallback(() => {
		if (file === null) {
			console.error("No file selected.");
			return;
		}
		if (options.dictionary === "") {
			console.error("No dictionary selected.");
			return;
		}
		if (options.strategy === "") {
			console.error("No strategy selected.");
			return;
		}
		if (
			!(dictionariesData?.data?.dictionaries ?? []).includes(options.dictionary)
		) {
			console.error(
				"Invalid dictionary selected.",
				options.dictionary,
				dictionariesData?.data?.dictionaries
			);
			return;
		}
		if (!(strategiesData?.data?.strategies ?? []).includes(options.strategy)) {
			console.error(
				"Invalid strategy selected.",
				options.strategy,
				strategiesData?.data?.strategies
			);
			return;
		}
		uploadFile(file).then((res) => {
			refresh(res.filename, options.dictionary, options.strategy);
			setFileName(res.filename);
			navigate(`/analyze`);
		});
	}, [
		dictionariesData?.data?.dictionaries,
		file,
		navigate,
		options.dictionary,
		options.strategy,
		refresh,
		setFileName,
		strategiesData?.data?.strategies,
	]);
	useEffect(() => {
		setFileName("");
	}, [setFileName]);
	if (isLoading) {
		return <Loading />;
	}
	if (error) {
		return (
			<Error
				error={error}
				retry={() => {
					mutateDictionaries();
					mutateStrategies();
				}}
			/>
		);
	}
	const dictionaries = dictionariesData!.data.dictionaries;
	const strategies = strategiesData!.data.strategies;
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
									value={options.dictionary}
									onChange={(e) => {
										setOptions((prev) => ({
											...prev,
											dictionary: e.target.value as string,
										}));
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
							<FormControl fullWidth>
								<InputLabel id="strategy-select-label">Strategy</InputLabel>
								<Select
									label="Strategy"
									labelId="strategy-select-label"
									id="strategy-select"
									value={options.strategy}
									onChange={(e) => {
										setOptions((prev) => ({
											...prev,
											strategy: e.target.value as string,
										}));
									}}>
									{strategies.map((strat) => {
										return (
											<MenuItem key={strat} value={strat}>
												{strat}
											</MenuItem>
										);
									})}
								</Select>
								<FormHelperText>Select a strategy for analysis.</FormHelperText>
							</FormControl>
							<Button
								onClick={submit}
								disabled={
									file === null ||
									options.dictionary === "" ||
									options.strategy === ""
								}
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
