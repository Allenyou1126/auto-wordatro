import { Box, Button, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useState } from "react";

export default function FileUpload(props: {
	buttonText: string;
	tip: string;
	onChange?: (file: File | null) => void;
	accept: string;
}) {
	const [fileName, setFileName] = useState<string | null>(null);
	return (
		<Box
			sx={{
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				justifyContent: "space-between",
			}}>
			<Typography
				display="inline-block"
				variant="body1"
				textOverflow="ellipsis"
				overflow="hidden"
				whiteSpace="nowrap">
				{fileName === null ? props.tip : fileName}
			</Typography>
			<FileUploadButton
				buttonText={props.buttonText}
				accept={props.accept}
				onChange={(file) => {
					setFileName(file?.name ?? null);
					props.onChange?.(file);
				}}
			/>
		</Box>
	);
}

function FileUploadButton({
	onChange,
	accept,
	buttonText,
}: {
	onChange?: (file: File | null) => void;
	accept: string;
	buttonText: string;
}) {
	return (
		<Button
			component="label"
			variant="contained"
			color="primary"
			sx={{ flexShrink: "0" }}>
			<AddIcon /> {buttonText}
			<input
				type="file"
				hidden
				accept={accept}
				max={1}
				onChange={(e) => {
					const file = e.target.files?.[0];
					onChange?.(file ?? null);
				}}
			/>
		</Button>
	);
}
