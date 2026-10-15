import test from 'node:test';
import assert from 'node:assert/strict';
import { act, createRoom, maxBet, player, publicRoom, shoe, tick, total } from '../lib/game';
import type { Card, Room } from '../lib/types';
let seq = 0;
const card = (rank: string): Card => ({ rank, suit: '♠', id: `test-${seq++}` });
function table(hands: string[][], dealer: string[], mode: 'ai' | 'player' = 'ai') {
  const r = createRoom('TESTAB', 'Alex', 'secret');
  r.settings.bots = 0;
  r.settings.mode = mode;
  if (mode === 'player') r.players.push(player('Sam'));
  act(r, r.hostId, { type: 'start' });
  const betting = r.players.filter((p) => p.id !== r.dealerId);
  const draws = [...hands.flat(), ...dealer].map(card);
  r.deck = draws.reverse();
  for (const p of betting) act(r, p.id, { type: 'bet', amount: 100 });
  return r;
}
function finishDealer(r: Room) {
  let guard = 0;
  while (r.phase === 'dealer' && guard++ < 20) tick(r, Math.max(r.deadline + 1, Date.now() + 2000));
}
test('aces adapt and the six-deck shoe has unique cards', () => {
  assert.deepEqual(total(['A', 'A', '9'].map(card)), { value: 21, soft: true });
  assert.deepEqual(total(['A', '8', '9'].map(card)), { value: 18, soft: false });
  const s = shoe();
  assert.equal(s.length, 312);
  assert.equal(new Set(s.map((c) => c.id)).size, 312);
});
test('blackjack pays 3:2 and the dealer hole card stays private', () => {
  const r = table([['A', 'K']], ['10', '7']);
  assert.equal(r.phase, 'dealer');
  finishDealer(r);
  assert.equal(r.players[0].chips, 5150);
  assert.equal(r.players[0].hands[0].profit, 150);
  const hidden = table([['10', '6']], ['10', '7']);
  const safe = publicRoom(hidden, hidden.hostId);
  assert.equal(safe.dealer[1], null);
  assert.ok(!('deck' in safe));
  assert.ok(!('tokens' in safe));
});
test('equal totals push, busts lose, and dealer blackjack is resolved immediately', () => {
  const push = table([['10', '8']], ['10', '8']);
  act(push, push.hostId, { type: 'stand' });
  finishDealer(push);
  assert.equal(push.players[0].chips, 5000);
  const bust = table([['10', '6']], ['10', '7']);
  bust.deck = [card('K')];
  act(bust, bust.hostId, { type: 'hit' });
  finishDealer(bust);
  assert.equal(bust.players[0].chips, 4900);
  assert.equal(bust.players[0].hands[0].state, 'bust');
  const natural = table([['A', 'K']], ['A', 'Q']);
  assert.equal(natural.phase, 'results');
  assert.equal(natural.players[0].chips, 5000);
});
test('double draws exactly one card and settles a doubled wager', () => {
  const r = table([['5', '6']], ['10', '7']);
  r.deck = [card('10')];
  act(r, r.hostId, { type: 'double' });
  assert.equal(r.players[0].hands[0].cards.length, 3);
  assert.equal(r.players[0].hands[0].bet, 200);
  assert.equal(r.phase, 'dealer');
  finishDealer(r);
  assert.equal(r.players[0].chips, 5200);
});
test('split hands advance independently and split 21 is a regular win', () => {
  const r = table([['K', 'K']], ['10', '7']);
  r.deck = [card('A'), card('A')];
  act(r, r.hostId, { type: 'split' });
  assert.equal(r.players[0].hands.length, 2);
  assert.ok(r.players[0].hands.every((h) => h.split && h.state === 'stood'));
  finishDealer(r);
  assert.equal(r.players[0].chips, 5200);
  const aces = table([['A', 'A']], ['10', '7']);
  aces.deck = [card('5'), card('6')];
  act(aces, aces.hostId, { type: 'split' });
  assert.equal(aces.phase, 'dealer');
  assert.ok(aces.players[0].hands.every((h) => h.state === 'stood'));
});
test('invalid actions, insufficient chips, and out-of-turn requests are rejected', () => {
  const r = table([['10', '6']], ['10', '7']);
  assert.throws(() => act(r, 'intruder', { type: 'hit' }));
  assert.throws(() => act(r, r.hostId, { type: 'split' }), /matching ranks/);
  r.players[0].chips = 0;
  assert.throws(() => act(r, r.hostId, { type: 'double' }), /enough chips/);
});
test('human dealer bankroll is conserved and the dealer seat rotates', () => {
  const r = table([['10', '9']], ['10', '7'], 'player');
  const challenger = r.players.find((p) => p.id !== r.dealerId)!;
  act(r, challenger.id, { type: 'stand' });
  assert.throws(() => act(r, r.dealerId!, { type: 'hit' }), /stand on 17/);
  act(r, r.dealerId!, { type: 'stand' });
  assert.equal(challenger.chips, 5100);
  assert.equal(r.players.find((p) => p.id === r.dealerId)!.chips, 4900);
  assert.equal(
    r.players.reduce((s, p) => s + p.chips, 0),
    10000,
  );
  const old = r.dealerId;
  act(r, r.hostId, { type: 'next' });
  assert.notEqual(r.dealerId, old);
  assert.equal(r.phase, 'betting');
});
test('dealer liability limits bets and cannot go negative', () => {
  const r = createRoom('TESTAC', 'Alex', 'secret');
  r.settings.bots = 0;
  r.settings.mode = 'player';
  const p = player('Sam');
  r.players.push(p);
  act(r, r.hostId, { type: 'start' });
  r.players[0].chips = 150;
  assert.equal(maxBet(r, p), 100);
  assert.throws(() => act(r, p.id, { type: 'bet', amount: 101 }), /table limits/);
  r.deck = ['10', '7', 'K', 'A'].map(card);
  act(r, p.id, { type: 'bet', amount: 100 });
  finishDealer(r);
  assert.equal(r.players[0].chips, 0);
  assert.equal(r.players[0].eliminated, true);
  assert.equal(r.phase, 'finished');
  assert.equal(p.chips, 5150);
});
test('timeouts place minimum bets and stand on an abandoned hand', () => {
  const r = createRoom('TESTAD', 'Alex', 'secret');
  r.settings.bots = 0;
  act(r, r.hostId, { type: 'start' });
  r.deck = ['7', '10', '6', '10'].map(card);
  tick(r, r.deadline + 1);
  assert.equal(r.phase, 'playing');
  assert.equal(r.players[0].hands[0].bet, 100);
  tick(r, r.deadline + 1);
  assert.equal(r.phase, 'dealer');
  finishDealer(r);
  assert.equal(r.phase, 'results');
});
test('non-hosts cannot start or change settings and lobbies can reset', () => {
  const r = createRoom('TESTAE', 'Alex', 'secret'),
    p = player('Sam');
  r.players.push(p);
  assert.throws(() => act(r, p.id, { type: 'start' }), /host/);
  r.settings.bots = 0;
  act(r, r.hostId, { type: 'start' });
  r.phase = 'results';
  r.players[0].chips = 20;
  act(r, r.hostId, { type: 'restart' });
  assert.equal(r.phase, 'lobby');
  assert.ok(r.players.every((p) => p.chips === 5000));
});
