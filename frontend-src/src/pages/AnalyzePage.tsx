import { useNavigate, useParams, useSearchParams } from "react-router";
import { getUploadedFileUrl, useAnalyze, useDictionaries } from "../libs/api";
import { useNotifications } from "@toolpad/core";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
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
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Loading from "../components/Loading";
import { useState } from "react";

function WordItem({ length, words }: { length: number; words: string[] }) {
	return (
		<Accordion>
			<AccordionSummary expandIcon={<ExpandMoreIcon />}>
				<Typography>Length {length}</Typography>
			</AccordionSummary>
			<AccordionDetails>
				<Typography sx={{ fontFamily: "'Cascadia Mono', monospace" }}>
					{words.join(", ")}
				</Typography>
			</AccordionDetails>
		</Accordion>
	);
}

export function AnalyzePage() {
	const notification = useNotifications();
	const navigate = useNavigate();
	const { filename } = useParams();
	const [searchParams] = useSearchParams();
	const dictionary = searchParams.get("dictionary");
	console.log(dictionary);
	const { data, error, isLoading, mutate } = useAnalyze(filename, dictionary);
	const [dictionaryToUse, setDictionary] = useState<string>(dictionary ?? "");
	const {
		data: dictionariesData,
		isLoading: isLoadingDictionaries,
		error: dictionariesError,
	} = useDictionaries();
	if (error || dictionariesError) {
		console.log(error ?? dictionariesError);
		notification.show(error?.message ?? dictionariesError.message, {
			severity: "error",
		});
		return (
			<ErrorDisplay
				error={error ?? dictionariesError}
				retry={() => {
					mutate();
				}}
			/>
		);
	}
	if (!data || !dictionariesData || isLoading || isLoadingDictionaries) {
		return <Loading />;
	}
	console.log(dictionariesData.data.dictionaries);
	if (!dictionariesData.data.dictionaries.includes(dictionary ?? "")) {
		notification.show(
			`Dictionary "${dictionary}" is not available. Please select a valid dictionary.`,
			{ severity: "error" }
		);
		return <ErrorDisplay error={new Error("Invalid dictionary selected.")} />;
	}
	const res = data!;
	const words = Object.keys(res.words)
		.map((key) => {
			const id = parseInt(key);
			if (isNaN(id)) {
				return undefined;
			}
			return { length: id, words: res.words[id] };
		})
		.filter((item) => item !== undefined)
		.filter((item) => item!.words.length > 0)
		.sort((a, b) => b.length - a.length);
	return (
		<Box sx={{ flexGrow: 1 }}>
			<Grid container spacing={2}>
				<Grid size={6}>
					<CardWithTitle title="Original Image">
						<img width="100%" src={getUploadedFileUrl(res.original_image)} />
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
											if (dictionaryToUse !== dictionary) {
												navigate({
													pathname: `/analyze/${filename}`,
													search: new URLSearchParams({
														dictionary: dictionaryToUse,
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
							<Typography fontWeight="700" variant="subtitle1">
								Regular:
							</Typography>
							<Typography>
								{res.debug_info.categories.Regular.map(
									(item) => item.matches.at(0)?.letter
								).join(" ")}
							</Typography>
							<Typography fontWeight="700	" variant="subtitle1">
								Improved:
							</Typography>
							<Typography>
								{res.debug_info.categories.Improved.map(
									(item) => item.matches.at(0)?.letter
								).join(" ")}
							</Typography>
							<Typography fontWeight="700	" variant="subtitle1">
								Special:
							</Typography>
							<Typography>
								{res.debug_info.categories.Special.map(
									(item) => item.matches.at(0)?.letter
								).join(" ")}
							</Typography>
							<Typography fontWeight="700	" variant="subtitle1">
								Max Length:
							</Typography>
							<Typography>{res.debug_info.max_length}</Typography>
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
