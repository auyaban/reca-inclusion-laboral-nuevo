import type { ComponentProps } from "react";
import { LongFormSuccessState } from "@/components/forms/shared/LongFormShell";

export type LongFormSuccessLinks =
  ComponentProps<typeof LongFormSuccessState>["links"];

export type LongFormFinalizedSuccess<TExtra extends object = object> = TExtra & {
  companyName: string;
  links: LongFormSuccessLinks;
};
