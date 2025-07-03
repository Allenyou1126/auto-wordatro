import { Box, Button, Typography } from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export default function FileUpload(props: {
	buttonText: string;
	tip: string;
	onChange?: (file: File | null) => void;
	accept: string;
}) {
	const [fileName, setFileName] = useState<string | null>(null);
	const handleFileChange = useCallback(
		(file: File | null) => {
			setFileName(file?.name ?? null);
			props.onChange?.(file);
		},
		[props]
	);
	const acceptList = useMemo(
		() => props.accept.split(",").map((type) => type.trim()),
		[props.accept]
	);
	const inputRef = useRef<HTMLInputElement>(null);
	const handlePaste = useCallback(
		(e: ClipboardEvent) => {
			e.stopPropagation();
			if (!e.clipboardData) {
				return;
			}
			const fileList = Array.from(e.clipboardData.files).filter((f) => {
				return acceptList.some((type) => f.name.endsWith(type));
			});
			if (fileList.length !== 0) {
				handleFileChange(fileList[0]);
				return;
			}
		},
		[acceptList, handleFileChange]
	);
	useEffect(() => {
		document.addEventListener("paste", handlePaste);
		return () => {
			document.removeEventListener("paste", handlePaste);
		};
	}, [handlePaste]);
	return (
		<Box
			sx={{
				width: "100%",
				aspectRatio: "2",
			}}>
			<Button
				variant="contained"
				sx={{
					width: "100%",
					height: "100%",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					textTransform: "none",
					gap: 2,
				}}
				onDragOver={(e) => {
					e.preventDefault();
				}}
				onDrop={(e) => {
					e.preventDefault();
					const fileList = Array.from(e.dataTransfer.files).filter((f) => {
						return acceptList.some((type) => f.name.endsWith(type));
					});
					if (fileList.length === 0) {
						return;
					}
					handleFileChange(fileList[0]);
				}}
				onClick={() => {
					inputRef.current?.click();
				}}>
				<UploadFileIcon sx={{ pointerEvents: "none" }} fontSize="large" />
				<Typography
					sx={{ pointerEvents: "none" }}
					display="inline-block"
					variant="h6">
					{props.buttonText}
				</Typography>
				<Typography
					sx={{ pointerEvents: "none" }}
					display="inline-block"
					variant="subtitle2">
					{fileName ?? props.tip}
				</Typography>
				<input
					style={{ pointerEvents: "none" }}
					type="file"
					hidden
					accept={props.accept}
					max={1}
					ref={inputRef}
					onChange={(e) => {
						const file = e.target.files?.[0];
						handleFileChange(file ?? null);
					}}
				/>
			</Button>
		</Box>
	);
}
