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
import {
	uploadFile,
	useDictionaries,
	useRefreshAnalyze,
	useStrategies,
} from "../libs/api";
import { useNavigate } from "react-router";
import Loading from "../components/Loading";
import { Error } from "../components/Error";

export function HomePage() {
	const [file, setFile] = useState<File | null>(null);
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
	const [dictionary, setDictionary] = useState<string>("YAWL");
	const [strategy, setStrategy] = useState<string>("bold97");
	const refresh = useRefreshAnalyze();
	const isLoading = isLoadingDictionaries || isLoadingStrategies;
	const error = dictionariesError || strategiesError;
	const submit = useCallback(() => {
		if (file === null) {
			console.error("No file selected.");
			return;
		}
		if (dictionary === "") {
			console.error("No dictionary selected.");
			return;
		}
		if (strategy === "") {
			console.error("No strategy selected.");
			return;
		}
		if (!(dictionariesData?.data?.dictionaries ?? []).includes(dictionary)) {
			console.error(
				"Invalid dictionary selected.",
				dictionary,
				dictionariesData?.data?.dictionaries
			);
			return;
		}
		if (!(strategiesData?.data?.strategies ?? []).includes(strategy)) {
			console.error(
				"Invalid strategy selected.",
				strategy,
				strategiesData?.data?.strategies
			);
			return;
		}
		uploadFile(file).then((res) => {
			refresh(res.filename, dictionary);
			navigate({
				pathname: `/analyze/${res.filename}`,
				search: new URLSearchParams({ dictionary, strategy }).toString(),
			});
		});
	}, [
		dictionariesData?.data?.dictionaries,
		dictionary,
		file,
		navigate,
		refresh,
		strategiesData?.data?.strategies,
		strategy,
	]);
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
							<FormControl fullWidth>
								<InputLabel id="strategy-select-label">Strategy</InputLabel>
								<Select
									label="Strategy"
									labelId="strategy-select-label"
									id="strategy-select"
									value={strategy ?? ""}
									onChange={(e) => {
										setStrategy(e.target.value as string);
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
								disabled={file === null || dictionary === "" || strategy === ""}
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
