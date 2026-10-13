import { positionFromFen } from '@/components/chess/chessLogic';

export type BoardOrientation = 'white' | 'black';

export interface PositionDeepLink {
  fen: string;
  orientation: BoardOrientation;
  source: 'puzzle' | null;
}

export type PositionDeepLinkResult =
  | { value: PositionDeepLink; error: null }
  | { value: null; error: string };

export function readPositionDeepLink(search: string): PositionDeepLinkResult {
  const params = new URLSearchParams(search);
  const rawFen = params.get('fen');
  if (!rawFen) return { value: null, error: '' };

  const fen = rawFen.replace(/_/g, ' ').trim();
  if (!positionFromFen(fen)) {
    return { value: null, error: 'That position link is invalid. The standard starting position is shown instead.' };
  }

  const orientation: BoardOrientation = params.get('orientation') === 'black' ? 'black' : 'white';
  return {
    value: { fen, orientation, source: params.get('source') === 'puzzle' ? 'puzzle' : null },
    error: null,
  };
}

export function buildPositionHref(
  pathname: '/analysis' | '/explain',
  fen: string,
  orientation: BoardOrientation,
): string {
  const params = new URLSearchParams({ fen, orientation, source: 'puzzle' });
  return `${pathname}?${params.toString()}`;
}
