import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoom } from '../lib/game';
import { updateRoom } from '../lib/store';
import type { RoomStorage } from '../lib/storage/types';

class MemoryStorage implements RoomStorage {
  snapshot = JSON.stringify(createRoom('TESTAB', 'Host', 'secret'));
  writes = 0;
  async read() {
    return this.snapshot;
  }
  async create() {
    return false;
  }
  async compareAndSet(_code: string, expected: string, next: string) {
    if (expected !== this.snapshot) return false;
    this.snapshot = next;
    this.writes++;
    return true;
  }
}

test('conflicting serverless updates retry without losing changes', async () => {
  const storage = new MemoryStorage();
  await Promise.all(
    Array.from({ length: 12 }, () =>
      updateRoom(
        'TESTAB',
        (room) => {
          room.players[0].chips += 1;
        },
        storage,
      ),
    ),
  );
  const room = JSON.parse(storage.snapshot);
  assert.equal(room.players[0].chips, 5012);
  assert.equal(storage.writes, 12);
});

test('reads do not write and rejected mutations cannot change stored state', async () => {
  const storage = new MemoryStorage();
  const before = storage.snapshot;
  await updateRoom('TESTAB', (room) => room.code, storage);
  assert.equal(storage.writes, 0);
  await assert.rejects(
    updateRoom(
      'TESTAB',
      (room) => {
        room.players[0].chips = 0;
        throw new Error('Rejected move');
      },
      storage,
    ),
    /Rejected move/,
  );
  assert.equal(storage.snapshot, before);
});

test('expired rooms and invalid codes are rejected', async () => {
  const storage = new MemoryStorage();
  const room = JSON.parse(storage.snapshot);
  room.updated = Date.now() - 25 * 60 * 60 * 1000;
  storage.snapshot = JSON.stringify(room);
  await assert.rejects(
    updateRoom('TESTAB', () => {}, storage),
    /expired/,
  );
  await assert.rejects(
    updateRoom('../etc', () => {}, storage),
    /valid/,
  );
});
