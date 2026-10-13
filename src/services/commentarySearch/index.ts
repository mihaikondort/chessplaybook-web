/**
 * commentarySearch — shared protocol for the "Explain Position" flow.
 *
 * Barrel re-exports only the pieces that are safe for the frontend
 * bundle (no Node-only code). NodeTransport lives under backend/ to
 * keep `require('stockfish')` out of the Vite build graph.
 */

export type { SearchTransport } from './SearchTransport';
export type { AnalysisServiceHook } from './WorkerTransport';
export { WorkerTransport } from './WorkerTransport';
export type { CommentarySearchData } from './CommentarySearchProtocol';
export {
  getCommentarySearchData,
  runMainSearch,
  runNullMoveSearch,
  parseMainSearch,
  COMMENTARY_HASH_MB,
  COMMENTARY_MULTIPV,
  COMMENTARY_MOVETIME_MS,
} from './CommentarySearchProtocol';
