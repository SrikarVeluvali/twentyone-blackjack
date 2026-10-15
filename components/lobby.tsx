'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  Check,
  CheckCircle,
  Coins,
  Copy,
  Crown,
  DoorOpen,
  GearSix,
  Plus,
  Robot,
  Spade,
  Users,
} from '@phosphor-icons/react';
import type { PublicRoom, Settings } from '@/lib/types';
import { Avatar, format, type OnAction } from './game-ui';

export default function Lobby({
  room,
  busy,
  onAction,
  onCopy,
}: {
  room: PublicRoom;
  busy: boolean;
  onAction: OnAction;
  onCopy: () => void;
}) {
  const host = room.you === room.hostId;
  const [settings, setSettings] = useState<Settings>(room.settings);
  const [panel, setPanel] = useState<'players' | 'settings'>('players');
  const [settingsPage, setSettingsPage] = useState<'dealer' | 'limits'>('dealer');
  useEffect(() => {
    setSettings(room.settings);
  }, [
    room.settings.mode,
    room.settings.minBet,
    room.settings.bots,
    room.settings.maxPlayers,
    room.settings.dealerId,
    room.settings.turnSeconds,
  ]);
  const dirty = JSON.stringify(settings) !== JSON.stringify(room.settings);
  const seats = room.players.length + settings.bots;
  const invalid = seats > settings.maxPlayers || (settings.mode === 'player' && seats < 2);
  const computers = Array.from({ length: settings.bots }, (_, index) => ({
    id: `bot-${index}`,
    name: ['Jules', 'Mika', 'Theo'][index],
    bot: true,
  }));
  return (
    <section className={`lobby-screen show-${panel}`}>
      <div className="lobby-mobile-tabs segmented">
        <button
          className={panel === 'players' ? 'selected' : ''}
          onClick={() => setPanel('players')}
        >
          <Users />
          Players <span>{seats}</span>
        </button>
        <button
          className={panel === 'settings' ? 'selected' : ''}
          onClick={() => setPanel('settings')}
        >
          <GearSix />
          Table settings{dirty && <i className="status-dot" />}
        </button>
      </div>
      <div className="lobby-content">
        <section className="guest-panel panel">
          <div className="panel-heading">
            <div>
              <span className="overline">The guest list</span>
              <h2>Save a seat for your people.</h2>
            </div>
            <span className="badge">
              <Users />
              {seats} / {settings.maxPlayers}
            </span>
          </div>
          <div className="guest-grid">
            <AnimatePresence initial={false}>
              {room.players.map((player) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="guest-seat"
                  key={player.id}
                >
                  <span className={`guest-status ${player.id === room.hostId ? 'host' : ''}`}>
                    {player.id === room.hostId ? (
                      <>
                        <Crown weight="fill" />
                        Host
                      </>
                    ) : (
                      <>
                        <CheckCircle weight="fill" />
                        Ready
                      </>
                    )}
                  </span>
                  <Avatar player={player} />
                  <h3>
                    {player.name}
                    {player.id === room.you && <small> (you)</small>}
                  </h3>
                  <span className="guest-bankroll">
                    <Coins />
                    {format(player.chips)} <small>chips</small>
                  </span>
                </motion.div>
              ))}
              {computers.map((player) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="guest-seat computer-seat"
                  key={player.id}
                >
                  <span className="guest-status">
                    <Robot />
                    Computer
                  </span>
                  <Avatar player={player} />
                  <h3>{player.name}</h3>
                  <span className="guest-bankroll">
                    <Coins />
                    5,000 <small>chips</small>
                  </span>
                </motion.div>
              ))}
              {Array.from({ length: Math.max(0, settings.maxPlayers - seats) }, (_, i) => (
                <motion.button
                  layout
                  className="guest-seat empty-seat"
                  onClick={onCopy}
                  key={`empty-${i}`}
                  aria-label="Invite a friend to this seat"
                >
                  <span className="empty-avatar">
                    <Plus />
                  </span>
                  <strong>Open seat</strong>
                  <span>Invite a friend</span>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
          <div className="guest-invite">
            <span>
              <Spade weight="fill" />
              Private table. Good company.
            </span>
            <button className="button secondary" onClick={onCopy}>
              <Copy />
              Copy invite
            </button>
          </div>
        </section>
        <section className={`settings-panel panel settings-${settingsPage}`}>
          <div className="panel-heading">
            <div>
              <span className="overline">Your house rules</span>
              <h2>Set the table.</h2>
            </div>
            <GearSix />
          </div>
          <div className="settings-page-tabs segmented">
            <button
              className={settingsPage === 'dealer' ? 'selected' : ''}
              onClick={() => setSettingsPage('dealer')}
            >
              Dealer
            </button>
            <button
              className={settingsPage === 'limits' ? 'selected' : ''}
              onClick={() => setSettingsPage('limits')}
            >
              Table limits
            </button>
          </div>
          <fieldset disabled={!host || busy}>
            <div className="dealer-settings">
              <span className="field-label">Who’s dealing?</span>
              <div className="dealer-options">
                <button
                  className={settings.mode === 'ai' ? 'selected' : ''}
                  onClick={() => setSettings({ ...settings, mode: 'ai' })}
                  aria-pressed={settings.mode === 'ai'}
                >
                  <Robot weight="duotone" />
                  <span>
                    <strong>House dealer</strong>
                    <small>AI deals. You play.</small>
                  </span>
                  {settings.mode === 'ai' && <CheckCircle weight="fill" />}
                </button>
                <button
                  className={settings.mode === 'player' ? 'selected' : ''}
                  onClick={() => setSettings({ ...settings, mode: 'player' })}
                  aria-pressed={settings.mode === 'player'}
                >
                  <Users weight="duotone" />
                  <span>
                    <strong>Player dealer</strong>
                    <small>Take turns as the house.</small>
                  </span>
                  {settings.mode === 'player' && <CheckCircle weight="fill" />}
                </button>
              </div>
              {settings.mode === 'player' && (
                <label className="first-dealer">
                  First dealer
                  <select
                    value={settings.dealerId}
                    onChange={(event) => setSettings({ ...settings, dealerId: event.target.value })}
                  >
                    {room.players.map((player) => (
                      <option value={player.id} key={player.id}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <div className="settings-grid">
              <label>
                Minimum bet
                <select
                  value={settings.minBet}
                  onChange={(event) =>
                    setSettings({ ...settings, minBet: Number(event.target.value) })
                  }
                >
                  {[50, 100, 250, 500].map((n) => (
                    <option key={n} value={n}>
                      {format(n)} chips
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Computer opponents
                <select
                  value={settings.bots}
                  onChange={(event) =>
                    setSettings({ ...settings, bots: Number(event.target.value) })
                  }
                >
                  {[0, 1, 2, 3].map((n) => (
                    <option key={n} value={n}>
                      {n === 0 ? 'Friends only' : `${n} ${n === 1 ? 'opponent' : 'opponents'}`}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Table size
                <select
                  value={settings.maxPlayers}
                  onChange={(event) =>
                    setSettings({ ...settings, maxPlayers: Number(event.target.value) })
                  }
                >
                  {[4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n} seats
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Time per turn
                <select
                  value={settings.turnSeconds}
                  onChange={(event) =>
                    setSettings({ ...settings, turnSeconds: Number(event.target.value) })
                  }
                >
                  {[20, 30, 45, 60].map((n) => (
                    <option key={n} value={n}>
                      {n} seconds
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>
          <div className="settings-note">
            <Coins weight="duotone" />
            <p>
              <strong>5,000 chips each.</strong> No rebuys.
              <br />
              {host
                ? 'Your table, your rules. Ready when you are.'
                : 'The host controls the table settings.'}
            </p>
          </div>
        </section>
      </div>
      <div className="lobby-dock">
        <button className="button danger" disabled={busy} onClick={() => void onAction('leave')}>
          <DoorOpen />
          Leave table
        </button>
        <div className="lobby-ready">
          {invalid ? (
            <span className="inline-error">
              {seats > settings.maxPlayers
                ? 'Reduce opponents or increase table size.'
                : 'Player dealer needs at least two players.'}
            </span>
          ) : (
            <span>
              <i className="status-dot" />
              {host ? 'The table is yours.' : 'Waiting for the host…'}
            </span>
          )}
        </div>
        {host ? (
          <button
            className="button primary start-button"
            disabled={busy || invalid}
            onClick={() => void onAction(dirty ? 'settings' : 'start', dirty ? { settings } : {})}
          >
            {busy ? 'One moment…' : dirty ? 'Save settings' : 'Start game'}
            {dirty ? <Check /> : <ArrowRight />}
          </button>
        ) : (
          <span className="waiting-badge">
            <CheckCircle />
            Ready to play
          </span>
        )}
      </div>
    </section>
  );
}
