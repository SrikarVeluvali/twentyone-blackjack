import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { RedisRoomStorage } from '../lib/storage/redis';
import { createRoom } from '../lib/game';
import { updateRoom } from '../lib/store';

test('live Redis: unique creation, stale update rejection, parallel writers, and expiry', async () => {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  assert.ok(url && token, 'Configure Redis credentials in .env.local');
  // Unique short-lived keys keep this test separate from real rooms.
  const prefix = `twentyone:test:${randomUUID()}:`;
  const a = new RedisRoomStorage(url, token, prefix);
  const b = new RedisRoomStorage(url, token, prefix);
  try {
    assert.equal(await a.create('EXPIRY', 'first', 1), true);
    assert.equal(await b.create('EXPIRY', 'collision', 1), false);
    assert.equal(await b.compareAndSet('EXPIRY', 'stale', 'wrong', 1), false);
    assert.equal(await a.read('EXPIRY'), 'first');
    await setTimeout(1100);
    assert.equal(await b.read('EXPIRY'), null);
    await a.create('TESTAB', JSON.stringify(createRoom('TESTAB', 'Host', 'secret')), 60);
    await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        updateRoom(
          'TESTAB',
          (room) => {
            room.players[0].chips += 1;
          },
          i % 2 ? a : b,
        ),
      ),
    );
    const room = JSON.parse((await b.read('TESTAB'))!);
    assert.equal(room.players[0].chips, 5012);
  } finally {
    await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['DEL', `${prefix}TESTAB`, `${prefix}EXPIRY`]),
    });
  }
});
