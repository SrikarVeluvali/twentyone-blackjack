export type Suit = '♠' | '♥' | '♦' | '♣';
export type Card = { rank: string; suit: Suit; id: string };
export type Hand = {
  cards: Card[];
  bet: number;
  state: 'playing' | 'stood' | 'bust' | 'blackjack';
  split: boolean;
  result?: string;
  profit?: number;
};
export type Player = {
  id: string;
  name: string;
  chips: number;
  bot: boolean;
  hands: Hand[];
  bet: number | null;
  eliminated: boolean;
  connected: number;
};
export type Settings = {
  mode: 'ai' | 'player';
  minBet: number;
  bots: number;
  maxPlayers: number;
  dealerId: string;
  turnSeconds: number;
};
export type Phase = 'lobby' | 'betting' | 'playing' | 'dealer' | 'results' | 'finished';
export type Room = {
  code: string;
  hostId: string;
  players: Player[];
  settings: Settings;
  phase: Phase;
  round: number;
  deck: Card[];
  dealer: Card[];
  dealerId: string | null;
  turnId: string | null;
  handIndex: number;
  deadline: number;
  log: { id: string; text: string }[];
  version: number;
  created: number;
  updated: number;
  tokens: Record<string, string>;
  initialPlayers: number;
};
export type PublicRoom = Omit<Room, 'deck' | 'tokens' | 'dealer'> & {
  dealer: (Card | null)[];
  you: string;
  serverNow: number;
};
export type Action = { type: string; [key: string]: unknown };
