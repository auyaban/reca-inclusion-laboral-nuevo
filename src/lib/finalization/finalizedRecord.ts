interface BuildFinalizedRecordInsertOptions<
  TPayloadNormalized extends Record<string, unknown>,
> {
  registroId: string;
  actaRef: string;
  usuarioLogin: string;
  nombreUsuario: string;
  nombreFormato: string;
  nombreEmpresa: string;
  pathFormato: string;
  payloadRaw?: Record<string, unknown> | null;
  payloadNormalized: TPayloadNormalized;
  payloadSource: string;
  payloadGeneratedAt: string;
}

export function buildFinalizedRecordInsert<
  TPayloadNormalized extends Record<string, unknown>,
>({
  registroId,
  actaRef,
  usuarioLogin,
  nombreUsuario,
  nombreFormato,
  nombreEmpresa,
  pathFormato,
  payloadRaw,
  payloadNormalized,
  payloadSource,
  payloadGeneratedAt,
}: BuildFinalizedRecordInsertOptions<TPayloadNormalized>) {
  return {
    registro_id: registroId,
    acta_ref: actaRef,
    usuario_login: usuarioLogin,
    nombre_usuario: nombreUsuario,
    nombre_formato: nombreFormato,
    nombre_empresa: nombreEmpresa,
    path_formato: pathFormato,
    ...(payloadRaw === undefined ? {} : { payload_raw: payloadRaw }),
    payload_normalized: payloadNormalized,
    payload_source: payloadSource,
    payload_generated_at: payloadGeneratedAt,
  };
}
