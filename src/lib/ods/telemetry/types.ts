export type OdsTelemetryImportOrigin = "acta_pdf" | "acta_excel" | "acta_id_directo" | "manual";

export type OdsTelemetryConfidence = "low" | "medium" | "high";

export type OdsTelemetryJsonValue =
  | string
  | number
  | boolean
  | null
  | OdsTelemetryJsonValue[]
  | { [key: string]: OdsTelemetryJsonValue };

export type OdsTelemetryJsonObject = { [key: string]: OdsTelemetryJsonValue };

export type OdsMotorTelemetriaRow = {
  id: string;
  ods_id: string | null;
  idempotency_key: string | null;
  import_origin: OdsTelemetryImportOrigin;
  motor_suggestion: OdsTelemetryJsonObject;
  confidence: OdsTelemetryConfidence;
  final_value: OdsTelemetryJsonObject | null;
  mismatch_fields: string[];
  created_at: string;
  confirmed_at: string | null;
};

export type OdsTelemetryRpcEnvelope<TData = OdsTelemetryJsonObject | null> = {
  ok: boolean;
  code: string;
  message: string;
  data: TData;
};

export type OdsMotorTelemetriaRecordArgs = {
  p_ods_id?: string | null;
  p_import_origin?: OdsTelemetryImportOrigin | null;
  p_motor_suggestion?: OdsTelemetryJsonObject | null;
  p_confidence?: OdsTelemetryConfidence | null;
  p_idempotency_key?: string | null;
};

export type OdsMotorTelemetriaRecordData = {
  telemetria_id: string;
};

export type OdsMotorTelemetriaRecordResult =
  OdsTelemetryRpcEnvelope<OdsMotorTelemetriaRecordData | null>;

export type OdsMotorTelemetriaFinalizeArgs = {
  p_telemetria_id: string;
  p_ods_id: string;
  p_final_value: OdsTelemetryJsonObject;
};

export type OdsMotorTelemetriaFinalizeData = {
  telemetria_id: string;
  mismatch_fields: string[];
};

export type OdsMotorTelemetriaFinalizeResult =
  OdsTelemetryRpcEnvelope<OdsMotorTelemetriaFinalizeData | null>;
