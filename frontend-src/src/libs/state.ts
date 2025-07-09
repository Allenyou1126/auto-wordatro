import { atomWithStorage } from "jotai/utils";
import { atom } from "jotai";

type Options = {
	dictionary: string;
	strategy: string;
};

export const optionsState = atomWithStorage<Options>("options", {
	dictionary: "YAWL",
	strategy: "bold97",
});

export const fileNameState = atom<string>("");
