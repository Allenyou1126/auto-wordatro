import axios from "axios";
import useSWR from "swr";

const isProd = import.meta.env.PROD === true;

export const api = axios.create({
	baseURL: isProd ? "/api" : "http://127.0.0.1:5000/api",
	headers: {
		post: {
			"Content-Type": "application/json",
		},
		get: {
			Accept: "application/json",
		},
	},
});

export type ApiResponse<T> = {
	code: number;
	error: string;
	data: T;
};

export type MatchResult = {
	template: string;
	score: number;
	letter: string;
};

export type Result = {
	id: string;
	bbox: {
		x: number;
		y: number;
		width: number;
		height: number;
	};
	preview: string;
	matches: MatchResult[];
};

type CategoryName = "Regular" | "Improved" | "Special";

type AnalyzeResponse = {
	original_image: string;
	debug_image: string;
	categories: {
		[key in CategoryName]: Result[];
	};
};

export async function startAnalyze(
	filename?: string
): Promise<AnalyzeResponse> {
	if (!filename) {
		throw new Error("Filename is required for analysis.");
	}
	const response = await api.post<ApiResponse<AnalyzeResponse>>("/analyze", {
		filename,
	});
	if (response.status !== 200 || response.data.code !== 0) {
		throw new Error(
			response.status === 200 ? response.data.error : response.statusText
		);
	}
	return response.data.data;
}

export function useAnalyze(filename?: string) {
	return useSWR<AnalyzeResponse>(
		{ filename, type: "analyze" },
		async ({ filename }: { filename: string }) => {
			return await startAnalyze(filename);
		},
		{
			revalidateIfStale: false,
			revalidateOnFocus: false,
			revalidateOnReconnect: false,
			shouldRetryOnError: false,
		}
	);
}

type UploadFileResponse = {
	filename: string;
};

export async function uploadFile(file: File): Promise<UploadFileResponse> {
	const formData = new FormData();
	formData.append("file", file);
	const v = await api.post<ApiResponse<UploadFileResponse>>(
		"/upload",
		formData,
		{
			headers: { "Content-Type": "multipart/form-data" },
		}
	);
	if (v.status !== 200 || v.data.code !== 0) {
		throw new Error(v.status === 200 ? v.data.error : v.statusText);
	}
	return v.data.data;
}

export function getUploadedFileUrl(filename: string): string {
	return `${isProd ? "" : "http://127.0.0.1:5000"}/upload/${filename}`;
}
