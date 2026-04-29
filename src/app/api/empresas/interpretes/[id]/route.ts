import { buildCatalogoItemHandlers } from "@/lib/catalogos/api";

const handlers = buildCatalogoItemHandlers("interpretes");

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
