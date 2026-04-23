import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildFinalizationStatusIdempotencyKey,
  resolvePersistedFinalizationStatus,
  type FinalizedRecordsSupabaseClient,
} from "@/lib/finalization/finalizationStatus";
import { finalizationStatusRequestSchema } from "@/lib/validations/finalization";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = finalizationStatusRequestSchema.safeParse(body);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json(
        { error: issue?.message ?? "Datos invalidos" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { formSlug, finalization_identity: finalizationIdentity, requestHash } =
      parsed.data;
    const idempotencyKey = buildFinalizationStatusIdempotencyKey({
      formSlug,
      userId: user.id,
      identity: finalizationIdentity,
      requestHash,
    });

    const finalizedRecordsSupabase =
      supabase as unknown as FinalizedRecordsSupabaseClient;
    const status = await resolvePersistedFinalizationStatus({
      supabase: finalizedRecordsSupabase,
      userId: user.id,
      formSlug,
      idempotencyKey,
      identity: finalizationIdentity,
    });

    if (status.status === "succeeded") {
      return NextResponse.json(status, { status: 200 });
    }

    if (status.status === "failed") {
      return NextResponse.json(status, { status: 409 });
    }

    if (status.status === "processing") {
      return NextResponse.json(status, { status: 202 });
    }

    return NextResponse.json(status, { status: 404 });
  } catch (error) {
    console.error("[finalization_status] failed", error);
    return NextResponse.json(
      { error: "No se pudo consultar el estado de la publicacion." },
      { status: 500 }
    );
  }
}
