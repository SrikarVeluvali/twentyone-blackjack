import assert from 'node:assert/strict';
const base = process.env.TEST_URL || 'http://127.0.0.1:3000';
async function request(body, token) {
  const response = await fetch(`${base}/api/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: base,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
}
async function read(code, token) {
  const response = await fetch(`${base}/api/rooms?code=${code}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return (await response.json()).room;
}
function value(cards) {
  let n = 0,
    a = 0;
  for (const c of cards) {
    n += c.rank === 'A' ? 11 : ['K', 'Q', 'J'].includes(c.rank) ? 10 : Number(c.rank);
    if (c.rank === 'A') a++;
  }
  while (n > 21 && a) {
    n -= 10;
    a--;
  }
  return n;
}
for (const mode of ['ai', 'player']) {
  const host = await request({ type: 'create', name: `QA Host ${mode}` });
  const code = host.room.code;
  assert.equal(
    (await fetch(`${base}/api/rooms?code=${code}`)).status,
    401,
    'Room snapshots require a seat token',
  );
  assert.equal(
    (
      await fetch(`${base}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://example.invalid' },
        body: JSON.stringify({ type: 'create', name: 'Forbidden' }),
      })
    ).status,
    403,
    'Cross-origin mutations must be rejected',
  );
  const guest = await request({ type: 'join', name: 'QA Guest', code });
  const tokens = { [host.room.you]: host.token, [guest.room.you]: guest.token };
  const send = (id, type, extra = {}) => request({ code, action: { type, ...extra } }, tokens[id]);
  let room = await read(code, host.token);
  assert.equal(room.players.length, 2);
  await assert.rejects(() => send(guest.room.you, 'start'), /host/);
  await send(host.room.you, 'settings', { settings: { ...room.settings, mode, bots: 0 } });
  room = (await send(host.room.you, 'start')).room;
  let firstDealer = room.dealerId;
  for (let round = 1; round <= 3; round++) {
    for (const p of room.players.filter((p) => p.id !== room.dealerId && !p.eliminated)) {
      if (round === 1) {
        const attempts = await Promise.allSettled([
          send(p.id, 'bet', { amount: 100 }),
          send(p.id, 'bet', { amount: 100 }),
        ]);
        assert.equal(
          attempts.filter((r) => r.status === 'fulfilled').length,
          1,
          'Duplicate bets must be serialized',
        );
      } else await send(p.id, 'bet', { amount: 100 });
    }
    let guard = 0;
    while (!['results', 'finished'].includes(room.phase) && guard++ < 80) {
      room = await read(code, host.token);
      assert.ok(!('deck' in room) && !('tokens' in room));
      if (room.phase === 'playing') {
        assert.equal(room.dealer[1], null);
        room = (await send(room.turnId, 'stand')).room;
      } else if (room.phase === 'dealer' && room.dealerId)
        room = (await send(room.dealerId, value(room.dealer) < 17 ? 'hit' : 'stand')).room;
      else if (room.phase === 'dealer') await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert.equal(room.phase, 'results');
    assert.ok(room.players.every((p) => p.chips >= 0));
    if (mode === 'player')
      assert.equal(
        room.players.reduce((s, p) => s + p.chips, 0),
        10000,
      );
    if (round < 3) {
      room = (await send(host.room.you, 'next')).room;
      if (mode === 'player' && round === 1) assert.notEqual(room.dealerId, firstDealer);
    }
  }
  await send(host.room.you, 'restart');
  await send(host.room.you, 'leave');
  room = await read(code, guest.token);
  assert.equal(room.hostId, guest.room.you);
  await send(guest.room.you, 'leave');
  console.log(
    `${mode}: two sessions, authentication, duplicate bet protection, three rounds, payouts, reset, and host transfer passed`,
  );
}
console.log('Multiplayer API smoke test passed.');
