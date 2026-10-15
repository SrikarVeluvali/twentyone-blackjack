import { randomInt, randomUUID } from 'node:crypto';
import type { Action, Card, Hand, Player, PublicRoom, Room, Settings, Suit } from './types';

export function total(cards: Card[]) {
  let value = 0,
    aces = 0;
  for (const c of cards) {
    if (c.rank === 'A') {
      value += 11;
      aces++;
    } else value += ['K', 'Q', 'J'].includes(c.rank) ? 10 : Number(c.rank);
  }
  while (value > 21 && aces) {
    value -= 10;
    aces--;
  }
  return { value, soft: aces > 0 };
}
export function shoe(): Card[] {
  const cards: Card[] = [];
  for (let d = 0; d < 6; d++)
    for (const suit of ['♠', '♥', '♦', '♣'] as Suit[])
      for (const rank of ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'])
        cards.push({ rank, suit, id: randomUUID() });
  for (let i = cards.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}
export function addLog(r: Room, text: string) {
  r.log = [...r.log.slice(-29), { id: randomUUID(), text }];
}
export function player(name: string, bot = false): Player {
  return {
    id: randomUUID(),
    name: name.trim().slice(0, 20) || 'Player',
    chips: 5000,
    bot,
    hands: [],
    bet: null,
    eliminated: false,
    connected: Date.now(),
  };
}
export function createRoom(code: string, name: string, token: string): Room {
  const p = player(name);
  return {
    code,
    hostId: p.id,
    players: [p],
    settings: { mode: 'ai', minBet: 100, bots: 2, maxPlayers: 6, dealerId: p.id, turnSeconds: 30 },
    phase: 'lobby',
    round: 0,
    deck: [],
    dealer: [],
    dealerId: null,
    turnId: null,
    handIndex: 0,
    deadline: 0,
    log: [{ id: randomUUID(), text: `${p.name} opened the table.` }],
    version: 1,
    created: Date.now(),
    updated: Date.now(),
    tokens: { [token]: p.id },
    initialPlayers: 0,
  };
}
function check(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
function draw(r: Room) {
  if (!r.deck.length) r.deck = shoe();
  return r.deck.pop()!;
}
function active(r: Room) {
  return r.players.filter((p) => !p.eliminated && p.id !== r.dealerId);
}
function setDeadline(r: Room, seconds = r.settings.turnSeconds) {
  r.deadline = Date.now() + seconds * 1000;
}
function exposure(r: Room, extra = 0) {
  return (
    active(r).reduce(
      (sum, p) =>
        sum +
        (p.hands.length
          ? p.hands.reduce((s, h) => s + h.bet * (h.split ? 1 : 1.5), 0)
          : (p.bet || 0) * 1.5),
      0,
    ) + extra
  );
}
export function maxBet(r: Room, p: Player) {
  const dealer = r.players.find((x) => x.id === r.dealerId);
  const available = dealer
    ? Math.floor((dealer.chips - exposure(r) + (p.bet || 0) * 1.5) / 1.5)
    : p.chips;
  return Math.max(0, Math.min(p.chips, available));
}
function beginRound(r: Room) {
  r.round++;
  r.phase = 'betting';
  r.turnId = null;
  r.dealer = [];
  for (const p of r.players) {
    p.hands = [];
    p.bet = null;
  }
  if (r.deck.length < 80) r.deck = shoe();
  setDeadline(r);
  addLog(r, `Round ${r.round}. Place your bets.`);
}
function deal(r: Room) {
  const participants = active(r).filter((p) => p.bet !== null && p.bet > 0);
  for (const p of participants) {
    const bet = p.bet!;
    p.chips -= bet;
    const cards = [draw(r), draw(r)];
    p.hands = [
      { cards, bet, state: total(cards).value === 21 ? 'blackjack' : 'playing', split: false },
    ];
  }
  r.dealer = [draw(r), draw(r)];
  addLog(r, 'Cards are on the table.');
  if (total(r.dealer).value === 21) {
    settle(r);
    return;
  }
  r.phase = 'playing';
  r.turnId = null;
  advance(r);
}
function advance(r: Room) {
  for (const p of active(r))
    for (let i = 0; i < p.hands.length; i++)
      if (p.hands[i].state === 'playing') {
        r.turnId = p.id;
        r.handIndex = i;
        setDeadline(r);
        return;
      }
  r.phase = 'dealer';
  r.turnId = r.dealerId;
  setDeadline(r);
  addLog(r, 'The dealer reveals their hand.');
}
function settle(r: Room) {
  const dealer = r.players.find((p) => p.id === r.dealerId),
    dv = total(r.dealer).value,
    natural = r.dealer.length === 2 && dv === 21;
  for (const p of active(r))
    for (const h of p.hands) {
      const value = total(h.cards).value;
      const win = value <= 21 && ((!natural && h.state === 'blackjack') || dv > 21 || value > dv);
      const push =
        value <= 21 &&
        (natural ? h.state === 'blackjack' : value === dv && h.state !== 'blackjack');
      const profit = win
        ? h.state === 'blackjack'
          ? Math.floor(h.bet * 1.5)
          : h.bet
        : push
          ? 0
          : -h.bet;
      p.chips += h.bet + profit;
      if (dealer) dealer.chips -= profit;
      h.profit = profit;
      h.result = win
        ? h.state === 'blackjack'
          ? 'Blackjack!'
          : 'You win'
        : push
          ? 'Push'
          : value > 21
            ? 'Busted'
            : 'Dealer wins';
    }
  for (const p of r.players)
    if (p.chips <= 0) {
      p.chips = 0;
      p.eliminated = true;
      addLog(r, `${p.name} is out of chips.`);
    }
  const alive = r.players.filter((p) => !p.eliminated);
  r.phase = alive.length <= (r.initialPlayers === 1 ? 0 : 1) ? 'finished' : 'results';
  r.turnId = null;
  r.deadline = 0;
  addLog(r, dv > 21 ? `Dealer busts with ${dv}.` : `Dealer finishes with ${dv}.`);
  if (r.phase === 'finished')
    addLog(r, alive[0] ? `${alive[0].name} wins the table!` : 'The house wins.');
}
export function act(r: Room, id: string, action: Action) {
  const p = r.players.find((x) => x.id === id);
  check(p, 'Your seat was not found. Rejoin the room.');
  p.connected = Date.now();
  const host = r.hostId === id;
  switch (action.type) {
    case 'settings': {
      check(host && r.phase === 'lobby', 'Only the host can configure the lobby.');
      const s = action.settings as Partial<Settings>;
      check(s && ['ai', 'player'].includes(s.mode!), 'Choose a dealer mode.');
      check(
        [50, 100, 250, 500].includes(s.minBet!) &&
          Number.isInteger(s.bots) &&
          s.bots! >= 0 &&
          s.bots! <= 3,
        'Invalid table settings.',
      );
      check(
        [4, 5, 6].includes(s.maxPlayers!) && [20, 30, 45, 60].includes(s.turnSeconds!),
        'Invalid table limits.',
      );
      check(
        r.players.length + s.bots! <= s.maxPlayers!,
        'There are too many players for this table size.',
      );
      check(
        r.players.some((x) => x.id === s.dealerId && !x.bot),
        'Choose a player as first dealer.',
      );
      r.settings = { ...r.settings, ...s } as Settings;
      break;
    }
    case 'start': {
      check(host && r.phase === 'lobby', 'Only the host can start the game.');
      check(
        r.settings.mode === 'ai' || r.players.length + r.settings.bots >= 2,
        'Player-dealer mode needs at least two players.',
      );
      check(
        r.players.length + r.settings.bots <= r.settings.maxPlayers,
        'This table has too many players.',
      );
      const names = ['Jules', 'Mika', 'Theo'];
      for (let i = 0; i < r.settings.bots; i++) r.players.push(player(names[i], true));
      r.initialPlayers = r.players.length;
      r.dealerId = r.settings.mode === 'player' ? r.settings.dealerId : null;
      beginRound(r);
      break;
    }
    case 'bet': {
      check(
        r.phase === 'betting' && !p.eliminated && p.id !== r.dealerId && p.bet === null,
        'You cannot place a bet right now.',
      );
      const amount = action.amount;
      check(
        typeof amount === 'number' && Number.isInteger(amount) && amount > 0,
        'Choose a whole-number bet.',
      );
      const max = maxBet(r, p);
      check(
        amount <= max && amount >= Math.min(r.settings.minBet, max),
        'That bet exceeds the table limits or available chips.',
      );
      p.bet = amount;
      addLog(r, `${p.name} bets ${amount.toLocaleString()}.`);
      if (active(r).every((x) => x.bet !== null)) deal(r);
      break;
    }
    case 'hit':
    case 'stand':
    case 'double':
    case 'split': {
      if (r.phase === 'dealer') {
        check(id === r.dealerId, 'It is the dealer’s turn.');
        check(
          action.type === 'hit' || action.type === 'stand',
          'The dealer can only hit or stand.',
        );
        check(
          action.type === 'hit' ? total(r.dealer).value < 17 : total(r.dealer).value >= 17,
          'The dealer must hit below 17 and stand on 17 or higher.',
        );
        if (action.type === 'hit') {
          r.dealer.push(draw(r));
          setDeadline(r);
          if (total(r.dealer).value > 21) settle(r);
        } else settle(r);
        break;
      }
      check(r.phase === 'playing' && r.turnId === id, 'Wait for your turn.');
      const h = p.hands[r.handIndex];
      check(h?.state === 'playing', 'This hand is already finished.');
      if (action.type === 'stand') h.state = 'stood';
      if (action.type === 'hit') {
        h.cards.push(draw(r));
        const v = total(h.cards).value;
        if (v >= 21) h.state = v > 21 ? 'bust' : 'stood';
      }
      if (action.type === 'double' || action.type === 'split') {
        check(h.cards.length === 2 && p.chips >= h.bet, 'You need two cards and enough chips.');
        const dealer = r.players.find((x) => x.id === r.dealerId);
        check(
          !dealer || dealer.chips >= exposure(r, h.bet),
          'The dealer cannot cover another bet.',
        );
        if (action.type === 'double') {
          p.chips -= h.bet;
          h.bet *= 2;
          h.cards.push(draw(r));
          h.state = total(h.cards).value > 21 ? 'bust' : 'stood';
        } else {
          check(
            h.cards[0].rank === h.cards[1].rank && p.hands.length < 4,
            'Split requires matching ranks (up to four hands).',
          );
          p.chips -= h.bet;
          const card = h.cards.pop()!;
          h.split = true;
          h.cards.push(draw(r));
          const next: Hand = { cards: [card, draw(r)], bet: h.bet, state: 'playing', split: true };
          if (card.rank === 'A') {
            h.state = 'stood';
            next.state = 'stood';
          } else {
            if (total(h.cards).value === 21) h.state = 'stood';
            if (total(next.cards).value === 21) next.state = 'stood';
          }
          p.hands.splice(r.handIndex + 1, 0, next);
        }
      }
      addLog(r, `${p.name}: ${action.type === 'double' ? 'double down' : action.type}.`);
      advance(r);
      break;
    }
    case 'next': {
      check(host && r.phase === 'results', 'Only the host can deal the next round.');
      if (r.settings.mode === 'player') {
        const start = r.players.findIndex((x) => x.id === r.dealerId);
        for (let i = 1; i <= r.players.length; i++) {
          const candidate = r.players[(start + i) % r.players.length];
          if (!candidate.eliminated) {
            r.dealerId = candidate.id;
            break;
          }
        }
      }
      beginRound(r);
      break;
    }
    case 'restart': {
      check(
        host && (r.phase === 'finished' || r.phase === 'results'),
        'Only the host can reset the table between rounds.',
      );
      r.players = r.players
        .filter((x) => !x.bot)
        .map((x) => ({ ...x, chips: 5000, eliminated: false, hands: [], bet: null }));
      r.phase = 'lobby';
      r.round = 0;
      r.dealer = [];
      r.dealerId = null;
      r.turnId = null;
      r.deadline = 0;
      addLog(r, 'Back in the lobby. Everyone has 5,000 chips.');
      break;
    }
    case 'leave': {
      check(r.phase === 'lobby', 'You can leave your seat from the lobby.');
      r.players = r.players.filter((x) => x.id !== id);
      for (const [key, value] of Object.entries(r.tokens)) if (value === id) delete r.tokens[key];
      if (host && r.players[0]) r.hostId = r.players[0].id;
      if (r.settings.dealerId === id) r.settings.dealerId = r.hostId;
      addLog(r, `${p.name} left the room.`);
      break;
    }
    default:
      throw new Error('Unknown action.');
  }
  r.version++;
  r.updated = Date.now();
}
export function tick(r: Room, now = Date.now()) {
  if (r.phase === 'betting') {
    for (const p of active(r))
      if (p.bet === null && (p.bot || now >= r.deadline)) {
        const max = maxBet(r, p);
        if (max === 0) p.bet = 0;
        else p.bet = Math.min(max, Math.max(r.settings.minBet, p.bot ? 100 : r.settings.minBet));
      }
    if (active(r).every((p) => p.bet !== null)) {
      deal(r);
      r.updated = now;
      r.version++;
    }
  } else if (r.phase === 'playing') {
    const p = r.players.find((x) => x.id === r.turnId);
    if (p && ((p.bot && now - r.updated > 1100) || now >= r.deadline)) {
      act(r, p.id, {
        type: p.bot && total(p.hands[r.handIndex].cards).value < 17 ? 'hit' : 'stand',
      });
    }
  } else if (r.phase === 'dealer') {
    const dealer = r.players.find((p) => p.id === r.dealerId);
    if (((!dealer || dealer.bot) && now - r.updated > 1000) || now >= r.deadline) {
      if (total(r.dealer).value < 17) {
        r.dealer.push(draw(r));
        r.updated = now;
        r.version++;
        setDeadline(r);
        if (total(r.dealer).value > 21) settle(r);
      } else {
        settle(r);
        r.version++;
      }
    }
  }
}
export function publicRoom(r: Room, id: string): PublicRoom {
  const { deck: _deck, tokens: _tokens, dealer, ...safe } = r;
  const hidden = r.phase === 'playing';
  return {
    ...structuredClone(safe),
    dealer: dealer.map((c, i) => (hidden && i === 1 ? null : c)),
    you: id,
    serverNow: Date.now(),
  };
}
