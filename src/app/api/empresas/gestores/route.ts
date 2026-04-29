import { buildCatalogoCollectionHandlers } from "@/lib/catalogos/api";

const handlers = buildCatalogoCollectionHandlers("gestores");

export const GET = handlers.GET;
export const POST = handlers.POST;
