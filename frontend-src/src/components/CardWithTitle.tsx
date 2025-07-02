import { Box, Card, CardContent, Typography } from "@mui/material";

export default function CardWithTitle({
	title,
	children,
	icon,
}: {
	title: string;
	readonly children?: React.ReactNode;
	readonly icon?: React.ReactNode;
}) {
	return (
		<Card
			variant="elevation"
			elevation={3}
			sx={{ width: "100%", flexGrow: 1, height: "100%" }}>
			<CardContent>
				<Box display="flex" flexDirection="column" gap={2} height="100%">
					<Box display="flex" flexDirection="row" alignItems="center" gap={1}>
						{icon}
						<Typography display="inline-flex" variant="h6">
							{title}
						</Typography>
					</Box>
					<Box>{children}</Box>
				</Box>
			</CardContent>
		</Card>
	);
}
