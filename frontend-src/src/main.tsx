import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import { RootLayout } from "./RootLayout";
import { SWRConfig } from "swr";
import { api } from "./libs/api";
import { NotFoundPage } from "./pages/NotFoundPage";
import { HomePage } from "./pages/HomePage";
import { DebugPage } from "./pages/DebugPage";
import { AnalyzePage } from "./pages/AnalyzePage";
import { ReactRouterAppProvider } from "@toolpad/core/react-router";
import { DialogsProvider, NotificationsProvider } from "@toolpad/core";
import { createTheme } from "@mui/material";

const lightTheme = createTheme({
	palette: {
		mode: "light",
		background: {},
	},
});
const darkTheme = createTheme({
	palette: {
		mode: "dark",
		background: {},
	},
});

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<SWRConfig
			value={{
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				fetcher: async (resource, _init?) => {
					const v = await api.get(resource);
					return v.data;
				},
			}}>
			<BrowserRouter>
				<ReactRouterAppProvider
					branding={{
						title: "Auto Wordatro",
					}}
					theme={{
						light: lightTheme,
						dark: darkTheme,
					}}>
					<NotificationsProvider
						slotProps={{
							snackbar: {
								anchorOrigin: {
									vertical: "bottom",
									horizontal: "center",
								},
							},
						}}>
						<DialogsProvider>
							<Routes>
								<Route path="/" element={<RootLayout />}>
									<Route index element={<HomePage />} />
									<Route path="/analyze/:filename" element={<AnalyzePage />} />
									<Route path="/debug/:filename" element={<DebugPage />} />
									<Route path="/404" element={<NotFoundPage />} />
									<Route path="*" element={<NotFoundPage />} />
								</Route>
							</Routes>
						</DialogsProvider>
					</NotificationsProvider>
				</ReactRouterAppProvider>
			</BrowserRouter>
		</SWRConfig>
	</StrictMode>
);
