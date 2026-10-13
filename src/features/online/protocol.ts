/**
 * Frontend WebSocket protocol types — mirrors backend/src/ws/protocol.ts.
 * Keep in sync manually when the backend protocol changes.
 */

export interface TimeControl {
  initial: number;   // seconds
  increment: number; // seconds added per move
}

export interface PlayerInfo {
  userId: string;
  username: string;
  rating: number;
}

export type TimeControlCategory = 'bullet' | 'blitz' | 'rapid' | 'classical';

// ---------------------------------------------------------------------------
// Client → Server
// ---------------------------------------------------------------------------

export type ClientMessage =
  | { type: 'ping' }
  | { type: 'pong' }
  | { type: 'seek'; payload: { timeControl: TimeControl; rated: boolean; color?: 'white' | 'black' | 'random' } }
  | { type: 'seek_cancel' }
  | { type: 'match_accept'; payload: { offerId: string } }
  | { type: 'move'; payload: { gameId: string; uci: string; timestamp: number } }
  | { type: 'resign'; payload: { gameId: string } }
  | { type: 'draw_offer'; payload: { gameId: string } }
  | { type: 'draw_accept'; payload: { gameId: string } }
  | { type: 'draw_decline'; payload: { gameId: string } }
  | { type: 'flag'; payload: { gameId: string } }
  | { type: 'game_state_request'; payload: { gameId: string; v?: number } }
  | { type: 'challenge_create'; payload: { timeControl: TimeControl; rated: boolean; color?: 'white' | 'black' | 'random' } }
  | { type: 'challenge_accept'; payload: { challengeId: string } }
  | { type: 'challenge_cancel' }
  | { type: 'tab_report'; payload: { gameId: string; tabSwitches: number } };

// ---------------------------------------------------------------------------
// Server → Client
// ---------------------------------------------------------------------------

export type ServerMessage =
  | { type: 'connected'; payload: { userId: string } }
  | { type: 'ping' }
  | { type: 'pong' }
  | { type: 'error'; payload: { code: string; message: string } }
  | { type: 'seek_ack'; payload: { seekId: string } }
  | { type: 'seek_cancelled' }
  // Authoritative seek state from the server, sent on every connect. Must win
  // over local `phase` — see the handler in useOnlineGame.
  | { type: 'seek_state'; payload: { seeking: boolean; seekId?: string } }
  | { type: 'seek_expired' }
  // A candidate match awaiting proof that this tab is awake. Answered
  // automatically with match_accept — no user action, no extra click.
  | {
      type: 'match_offer';
      payload: {
        offerId: string;
        opponent: { username: string; rating: number };
        timeControl: { initial: number; increment: number };
        rated: boolean;
        expiresAt: number;
      };
    }
  | { type: 'game_start'; payload: GameStartPayload }
  | { type: 'game_move'; payload: GameMovePayload }
  | { type: 'game_end'; payload: GameEndPayload }
  | { type: 'game_state'; payload: GameStatePayload }
  | { type: 'draw_offered'; payload: { gameId: string; byUserId: string } }
  | { type: 'draw_offer_ack'; payload: { gameId: string } }
  | { type: 'draw_declined'; payload: { gameId: string } }
  | { type: 'rating_update'; payload: RatingUpdatePayload }
  | { type: 'opponent_disconnected'; payload: { gameId: string } }
  | { type: 'opponent_reconnected'; payload: { gameId: string } }
  | { type: 'challenge_created'; payload: { challengeId: string } }
  | { type: 'challenge_cancelled' };

export interface GameStartPayload {
  gameId: string;
  white: PlayerInfo;
  black: PlayerInfo;
  timeControl: TimeControl;
  rated: boolean;
  fen: string;
}

export interface GameMovePayload {
  gameId: string;
  uci: string;
  san: string;
  fen: string;
  ply: number;
  clocks: { whiteMs: number; blackMs: number };
  lastMoveBy: 'white' | 'black';
}

export interface GameEndPayload {
  gameId: string;
  result: '1-0' | '0-1' | '1/2-1/2';
  reason:
    | 'checkmate'
    | 'resignation'
    | 'timeout'
    | 'stalemate'
    | 'insufficient_material'
    | 'fifty_move'
    | 'repetition'
    | 'draw_agreement'
    | 'abandonment';
}

export interface GameStatePayload {
  gameId: string;
  fen: string;
  moves: string[];
  clocks: { whiteMs: number; blackMs: number };
  status: 'active' | 'ended';
  result?: string;
  // Present on reconnect-recovery game_state (may have been missed game_start)
  white?: PlayerInfo;
  black?: PlayerInfo;
  drawOffer?: 'white' | 'black' | null;
}

export interface RatingUpdatePayload {
  gameId: string;
  timeControl: TimeControlCategory;
  yourRating: number;
  ratingChange: number;
  provisional: boolean;
}
