import { useNavigate, useParams, useSearchParams } from "react-router";
import {
	getUploadedFileUrl,
	useAnalyze,
	useDictionaries,
	useStrategies,
} from "../libs/api";
import { useNotifications } from "@toolpad/core";
import {
	Box,
	Button,
	FormControl,
	FormHelperText,
	Grid,
	InputLabel,
	MenuItem,
	Select,
	Stack,
	Typography,
} from "@mui/material";
import CardWithTitle from "../components/CardWithTitle";
import { Error as ErrorDisplay } from "../components/Error";
import Loading from "../components/Loading";
import { useState } from "react";

function WordItem({ length, words }: { length: number; words: string[] }) {
	return (
		<>
			{length !== 0 && <Typography variant="h6">Length {length}</Typography>}
			<Typography sx={{ fontFamily: "'Cascadia Mono', monospace" }}>
				{words.join(", ")}
			</Typography>
		</>
	);
}

export function AnalyzePage() {
	const notification = useNotifications();
	const navigate = useNavigate();
	const { filename } = useParams();
	const [searchParams] = useSearchParams();
	const dictionary = searchParams.get("dictionary") ?? "";
	const strategy = searchParams.get("strategy") ?? "";
	const {
		data: analyzeData,
		error: analyzeError,
		isLoading: isLoadingAnalyze,
		mutate,
	} = useAnalyze(filename, dictionary);
	const [dictionaryToUse, setDictionary] = useState<string>(dictionary);
	const [strategyToUse, setStrategy] = useState<string>(strategy);
	const {
		data: dictionariesData,
		isLoading: isLoadingDictionaries,
		error: dictionariesError,
	} = useDictionaries();
	const {
		data: strategiesData,
		isLoading: isLoadingStrategies,
		error: strategiesError,
	} = useStrategies();
	const error = analyzeError ?? dictionariesError ?? strategiesError;
	const isLoading =
		isLoadingAnalyze ||
		isLoadingDictionaries ||
		isLoadingStrategies ||
		!dictionariesData ||
		!strategiesData ||
		!analyzeData;
	if (error) {
		console.error(error);
		notification.show(error?.message, {
			severity: "error",
		});
		return (
			<ErrorDisplay
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
	if (!dictionariesData.data.dictionaries.includes(dictionary)) {
		notification.show(
			`Dictionary "${dictionary}" is not available. Please select a valid dictionary.`,
			{ severity: "error" }
		);
		return <ErrorDisplay error={new Error("Invalid dictionary selected.")} />;
	}
	if (!strategiesData.data.strategies.includes(strategy)) {
		notification.show(
			`Strategy "${strategy}" is not available. Please select a valid strategy.`,
			{ severity: "error" }
		);
		return <ErrorDisplay error={new Error("Invalid strategy selected.")} />;
	}
	const words = Object.keys(analyzeData.words)
		.map((key) => {
			const id = parseInt(key);
			if (isNaN(id)) {
				return undefined;
			}
			return { length: id, words: analyzeData.words[id] };
		})
		.filter((item) => item !== undefined)
		.filter((item) => item!.words.length > 0)
		.sort((a, b) => b.length - a.length);
	return (
		<Box sx={{ flexGrow: 1 }}>
			<Grid container spacing={2}>
				<Grid size={6}>
					<CardWithTitle title="Original Image">
						<img
							width="100%"
							src={getUploadedFileUrl(analyzeData.original_image)}
						/>
					</CardWithTitle>
				</Grid>
				<Grid size={6} container direction="column">
					<Grid size={12} sx={{ width: "100%" }}>
						<CardWithTitle title="Operations">
							<Stack
								direction="column"
								spacing={2}
								sx={{ alignItems: "start" }}>
								<FormControl fullWidth>
									<InputLabel id="dictionary-select-label">
										Dictionary
									</InputLabel>
									<Select
										label="Dictionary"
										labelId="dictionary-select-label"
										id="dictionary-select"
										value={dictionaryToUse}
										onChange={(e) => {
											setDictionary(e.target.value as string);
										}}>
										{dictionariesData?.data.dictionaries.map((dict) => {
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
										value={strategyToUse}
										onChange={(e) => {
											setStrategy(e.target.value as string);
										}}>
										{strategiesData?.data.strategies.map((strat) => {
											return (
												<MenuItem key={strat} value={strat}>
													{strat}
												</MenuItem>
											);
										})}
									</Select>
									<FormHelperText>
										Select a strategy for analysis.
									</FormHelperText>
								</FormControl>
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
											navigate({
												pathname: `/debug/${filename}`,
												search: searchParams.toString(),
											});
										}}>
										Inspect Debug Image
									</Button>
									<Button
										variant="contained"
										onClick={() => {
											if (
												dictionaryToUse !== dictionary ||
												strategyToUse !== strategy
											) {
												navigate({
													pathname: `/analyze/${filename}`,
													search: new URLSearchParams({
														dictionary: dictionaryToUse,
														strategy: strategyToUse,
													}).toString(),
												});
											}
											mutate(undefined, { revalidate: true });
										}}>
										Re-run Analyze
									</Button>
								</Stack>
							</Stack>
						</CardWithTitle>
					</Grid>
					<Grid size={12} sx={{ width: "100%", flexGrow: "1" }}>
						<CardWithTitle title="Analyze Results">
							<Box
								sx={{
									display: "flex",
									flexDirection: "row",
									gap: 2,
									flexWrap: "wrap",
								}}>
								<Box
									sx={{
										display: "flex",
										flexDirection: "row",
										gap: 1,
										flexBasis: "40%",
									}}>
									<Typography
										sx={{
											display: "inline-block",
											verticalAlign: "baseline",
											lineHeight: "1.75",
										}}
										fontWeight="700"
										variant="subtitle1">
										Regular:
									</Typography>
									<Typography
										sx={{
											display: "inline-block",
											verticalAlign: "baseline",
											lineHeight: "1.75",
											fontFamily: "'cascadia Mono', monospace",
										}}>
										{analyzeData.debug_info.categories.Regular.map(
											(item) => item.matches.at(0)?.letter
										).join(" ")}
									</Typography>
								</Box>
								<Box
									sx={{
										display: "flex",
										flexDirection: "row",
										gap: 1,
										flexBasis: "40%",
									}}>
									<Typography
										sx={{
											display: "inline-block",
											verticalAlign: "baseline",
											lineHeight: "1.75",
										}}
										fontWeight="700"
										variant="subtitle1">
										Improved:
									</Typography>
									<Typography
										component="span"
										sx={{
											display: "inline-block",
											verticalAlign: "baseline",
											lineHeight: "1.75",
											fontFamily: "'cascadia Mono', monospace",
										}}>
										{analyzeData.debug_info.categories.Improved.map(
											(item, index) => (
												<Typography
													component="span"
													key={index}
													sx={{
														fontStyle:
															item.matches.at(0)?.font === "bold"
																? "bold"
																: item.matches.at(0)?.font === "italic"
																? "italic"
																: undefined,
														textDecoration:
															item.matches.at(0)?.font === "underline"
																? "underline"
																: undefined,
														fontFamily: "'Cascadia Mono', monospace",
													}}>
													{item.matches.at(0)?.letter}{" "}
												</Typography>
											)
										)}
									</Typography>
								</Box>
								<Box
									sx={{
										display: "flex",
										flexDirection: "row",
										gap: 1,
										flexBasis: "40%",
									}}>
									<Typography
										sx={{
											display: "inline-block",
											verticalAlign: "baseline",
											lineHeight: "1.75",
										}}
										fontWeight="700"
										variant="subtitle1">
										Special:
									</Typography>
									<Typography
										sx={{
											display: "inline-block",
											verticalAlign: "baseline",
											lineHeight: "1.75",
											fontFamily: "'cascadia Mono', monospace",
										}}>
										{analyzeData.debug_info.categories.Special.map(
											(item) => item.matches.at(0)?.letter
										).join(" ")}
									</Typography>
								</Box>
								<Box
									sx={{
										display: "flex",
										flexDirection: "row",
										gap: 1,
										flexBasis: "40%",
									}}>
									<Typography
										sx={{
											display: "inline-block",
											verticalAlign: "baseline",
											lineHeight: "1.75",
										}}
										fontWeight="700"
										variant="subtitle1">
										Max Length:
									</Typography>
									<Typography
										sx={{
											display: "inline-block",
											verticalAlign: "baseline",
											lineHeight: "1.75",
											fontFamily: "'cascadia Mono', monospace",
										}}>
										{analyzeData.debug_info.max_length}
									</Typography>
								</Box>
							</Box>
						</CardWithTitle>
					</Grid>
				</Grid>
				<Grid size={12}>
					<CardWithTitle title="Available Words">
						<Stack sx={{ width: "100%" }}>
							{words.map((item) => {
								return (
									<WordItem
										key={item.length}
										length={item.length}
										words={item.words}
									/>
								);
							})}
						</Stack>
					</CardWithTitle>
				</Grid>
			</Grid>
		</Box>
	);
}
