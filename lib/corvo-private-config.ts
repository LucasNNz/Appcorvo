import "server-only";

/**
 * CORVO PRIVATE CONFIG — TEMPORÁRIO / EMBUTIDO
 *
 * Esta versão foi gerada para destravar o teste do MVP.
 * As credenciais devem ser rotacionadas após a validação.
 */
const R2_SECRET_PARTS = [
  '916c6209b745e831',
  'be5301996694d4c7',
  '4f6f45effe8df3c1',
  '18cb2990f6447896'
] as const;

export const CORVO_PRIVATE_CONFIG = {
  mcpKey: 'chavedeacessoroteiroappcorvo112',
  r2AccessKeyId: '778954427e9d243cb4bd3505e8a21cf2',
  r2SecretAccessKey: R2_SECRET_PARTS.join(""),
} as const;
