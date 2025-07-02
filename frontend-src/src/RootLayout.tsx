import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { DashboardLayout, PageContainer } from "@toolpad/core";
import { Outlet } from "react-router";

export function RootLayout() {
	return (
		<DashboardLayout hideNavigation>
			<PageContainer title="" breadcrumbs={[]}>
				<Outlet />
			</PageContainer>
		</DashboardLayout>
	);
}
