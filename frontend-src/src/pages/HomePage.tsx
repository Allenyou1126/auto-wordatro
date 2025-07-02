import { Grid, Box, Button, Typography } from "@mui/material";
import CardWithTitle from "../components/CardWithTitle";
import FileUpload from "../components/FileUpload";
import { useCallback, useState } from "react";
import { uploadFile } from "../libs/api";
import { useNavigate } from "react-router";

export function HomePage() {
	const [file, setFile] = useState<File | null>(null);
	const navigate = useNavigate();
	const submit = useCallback(() => {
		if (file === null) {
			return;
		}
		uploadFile(file).then((res) => {
			navigate(`/analyze/${res.filename}`);
		});
	}, [file, navigate]);
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
							tip="Upload an image file."
							accept=".png,.jpg,.jpeg,.bmp"
						/>
					</CardWithTitle>
				</Grid>
				<Grid size={12}>
					<CardWithTitle title="Operations">
						<Button
							onClick={submit}
							disabled={file === null}
							variant="contained">
							Start Analyze
						</Button>
					</CardWithTitle>
				</Grid>
			</Grid>
		</Box>
	);
}
