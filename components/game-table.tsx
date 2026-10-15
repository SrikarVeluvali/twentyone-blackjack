'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowClockwise,
  ArrowDown,
  ArrowRight,
  ArrowsSplit,
  CaretLeft,
  CaretRight,
  Check,
  Coins,
  Crown,
  House,
  Minus,
  Plus,
  Spade,
  Timer,
  Trophy,
  Users,
} from '@phosphor-icons/react';
import type { Player, PublicRoom } from '@/lib/types';
import { AnimatedChips, Avatar, CardFan, Chip, format, score, type OnAction } from './game-ui';
import { Standings } from './game-dialog';

function PlayerSeat({ player, room }: { player: Player; room: PublicRoom }) {
  const turn = room.turnId === player.id;
  const [inspected, setInspected] = useState<number | null>(null);
  useEffect(() => {
    setInspected(null);
  }, [room.turnId, room.handIndex, room.round]);
  const index = Math.min(
    inspected ?? (turn ? room.handIndex : 0),
    Math.max(0, player.hands.length - 1),
  );
  const hand = player.hands[index];
  const total = hand ? score(hand.cards) : 0;
  return (
    <div
      className={`player-seat ${turn ? 'has-turn' : ''} ${player.id === room.you ? 'your-seat' : ''} ${player.eliminated ? 'eliminated' : ''}`}
    >
      <div className="seat-hand-area">
        {hand ? (
          <>
            <CardFan key={`${room.round}-${index}`} cards={hand.cards} />
            <motion.span
              key={`${total}-${hand.state}`}
              initial={{ scale: 1.25 }}
              animate={{ scale: 1 }}
              className={`hand-score ${total > 21 ? 'bust' : hand.state === 'blackjack' ? 'natural' : ''}`}
            >
              {hand.state === 'blackjack' ? <Spade weight="fill" /> : null}
              {total > 21 ? `${total} · Bust` : total}
            </motion.span>
            <AnimatePresence>
              {hand.result && (
                <motion.span
                  className={`hand-outcome ${(hand.profit || 0) > 0 ? 'win' : (hand.profit || 0) < 0 ? 'loss' : 'push'}`}
                  key={hand.result}
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                >
                  {hand.result === 'Push'
                    ? 'Push'
                    : hand.profit! > 0
                      ? `+${format(hand.profit!)}`
                      : format(hand.profit || 0)}
                </motion.span>
              )}
            </AnimatePresence>
          </>
        ) : (
          <div className={`bet-spot ${player.bet ? 'placed' : ''}`}>
            {player.bet ? (
              <>
                <Chip value={player.bet} small />
                <strong>{format(player.bet)}</strong>
              </>
            ) : (
              <>
                <Spade weight="fill" />
                <span>
                  {player.eliminated
                    ? 'Out of chips'
                    : player.bet === 0
                      ? 'Sitting out'
                      : 'Place your bet'}
                </span>
              </>
            )}
          </div>
        )}
      </div>
      <div className="hand-tabs" aria-label={`${player.name}’s hands`}>
        {player.hands.length > 1 ? (
          player.hands.map((h, i) => (
            <button
              key={i}
              onClick={() => setInspected(i)}
              className={`${i === index ? 'selected' : ''} ${turn && i === room.handIndex ? 'playing' : ''}`}
              aria-label={`View ${player.name} hand ${i + 1}, ${score(h.cards)} points`}
              aria-pressed={i === index}
            >
              {i + 1}
              <span>{score(h.cards)}</span>
            </button>
          ))
        ) : (
          <span className="seat-bet">{hand ? `Bet ${format(hand.bet)}` : '\u00a0'}</span>
        )}
      </div>
      <div className="seat-nameplate">
        <Avatar player={player} />
        <div>
          <strong>
            {player.name}
            {player.id === room.you && <small> you</small>}
          </strong>
          <span>
            <Coins />
            <AnimatedChips value={player.chips} />
          </span>
        </div>
        {turn && <i className="status-dot" />}
      </div>
    </div>
  );
}

function ActionDock({
  room,
  busy,
  onAction,
}: {
  room: PublicRoom;
  busy: boolean;
  onAction: OnAction;
}) {
  const me = room.players.find((p) => p.id === room.you)!;
  const host = room.hostId === room.you,
    isDealer = room.dealerId === room.you,
    turn = room.turnId === room.you;
  const results = room.phase === 'results' || room.phase === 'finished';
  const [bet, setBet] = useState(room.settings.minBet);
  const current = me.hands[room.handIndex];
  const dealer = room.players.find((p) => p.id === room.dealerId);
  const exposure = room.players
    .filter((p) => p.id !== room.dealerId)
    .reduce((sum, p) => sum + (p.bet || 0) * 1.5, 0);
  const max = Math.max(
    0,
    Math.min(
      me.chips,
      dealer ? Math.floor((dealer.chips - exposure + (me.bet || 0) * 1.5) / 1.5) : me.chips,
    ),
  );
  const min = Math.min(room.settings.minBet, max),
    actualBet = Math.min(max, Math.max(min, bet));
  const betting = room.phase === 'betting' && !isDealer && !me.eliminated && me.bet === null;
  const playing = turn && room.phase === 'playing';
  const liveExposure = room.players
    .filter((p) => p.id !== room.dealerId)
    .reduce((sum, p) => sum + p.hands.reduce((s, h) => s + h.bet * (h.split ? 1 : 1.5), 0), 0);
  const canExtra =
    playing &&
    !!current &&
    current.cards.length === 2 &&
    me.chips >= current.bet &&
    (!dealer || dealer.chips >= liveExposure + current.bet);
  const dealerValue = score(room.dealer.filter((card) => card !== null));
  const turnPlayer = room.players.find((p) => p.id === room.turnId);
  const winner = room.players.find((p) => !p.eliminated);
  const net = me.hands.reduce((sum, h) => sum + (h.profit || 0), 0);
  let title = me.eliminated
    ? 'You’re spectating'
    : room.phase === 'betting'
      ? isDealer
        ? 'You’re dealing this round'
        : 'Your bet is in'
      : room.phase === 'dealer'
        ? 'Dealer’s turn'
        : `Waiting for ${turnPlayer?.name || 'the table'}`;
  let subtitle =
    room.phase === 'betting' ? 'The cards are coming.' : 'Your controls light up on your turn.';
  if (playing) {
    title = 'Your move';
    subtitle = `Hand ${room.handIndex + 1} · ${score(current.cards)} points`;
  }
  if (results) {
    title =
      room.phase === 'finished'
        ? winner
          ? `${winner.name} wins the table!`
          : 'The house wins'
        : me.eliminated
          ? 'Out of chips'
          : 'Round complete';
    subtitle = host ? 'Another hand? The table is yours.' : 'Waiting for the host to deal.';
  }
  return (
    <section
      className={`control-dock ${betting ? 'betting-dock' : ''} ${results ? 'results-dock' : ''}`}
      aria-label="Your game controls"
    >
      <div className="your-bankroll">
        <span className="bankroll-icon">
          <Coins weight="duotone" />
        </span>
        <div>
          <span>Your chips</span>
          <strong>
            <AnimatedChips value={me.chips} />
          </strong>
        </div>
      </div>
      {betting ? (
        <>
          <div className="bet-picker">
            <label htmlFor="bet-amount">Your wager</label>
            <div className="bet-stepper">
              <button
                aria-label="Decrease bet"
                onClick={() => setBet(Math.max(min, actualBet - 50))}
              >
                <Minus />
              </button>
              <input
                id="bet-amount"
                aria-label="Bet amount"
                type="number"
                min={min}
                max={max}
                step={1}
                value={actualBet}
                onChange={(event) => setBet(Number(event.target.value))}
              />
              <button
                aria-label="Increase bet"
                onClick={() => setBet(Math.min(max, actualBet + 50))}
              >
                <Plus />
              </button>
            </div>
          </div>
          <div className="chip-choices">
            {[100, 250, 500, 1000].map((n) => (
              <button
                className={actualBet === n ? 'selected' : ''}
                key={n}
                aria-label={`Bet ${n} chips`}
                disabled={n > max || n < min}
                onClick={() => setBet(n)}
              >
                <Chip value={n} small />
                <span>{format(n)}</span>
              </button>
            ))}
          </div>
          <button
            className="button primary deal-button"
            disabled={busy || max === 0}
            onClick={() => void onAction('bet', { amount: actualBet })}
          >
            {max === 0 ? 'Sitting out' : 'Place bet'}
            <Check />
          </button>
        </>
      ) : (
        <>
          <div className="move-context" aria-live="polite">
            <strong>
              {title}
              {results && !isDealer && net !== 0 && (
                <span className={net > 0 ? 'profit' : 'loss'}>
                  {net > 0 ? '+' : ''}
                  {format(net)}
                </span>
              )}
            </strong>
            <span>{subtitle}</span>
          </div>
          {results ? (
            <div className="round-controls">
              {host ? (
                room.phase === 'finished' ? (
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={() => void onAction('restart')}
                  >
                    <ArrowClockwise />
                    Play again
                  </button>
                ) : (
                  <>
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() => void onAction('restart')}
                    >
                      <House />
                      Lobby
                    </button>
                    <button
                      className="button primary"
                      disabled={busy}
                      onClick={() => void onAction('next')}
                    >
                      Next round
                      <ArrowRight />
                    </button>
                  </>
                )
              ) : (
                <span className="waiting-badge">
                  <Timer />
                  Next hand soon
                </span>
              )}
            </div>
          ) : isDealer && room.phase === 'dealer' ? (
            <button
              className="button primary dealer-action"
              disabled={busy}
              onClick={() => void onAction(dealerValue < 17 ? 'hit' : 'stand')}
            >
              <Crown />
              {dealerValue < 17 ? 'Hit · draw a card' : 'Stand · settle bets'}
            </button>
          ) : (
            <div className="game-actions">
              <button
                className="move-button hit-button"
                disabled={busy || !playing}
                onClick={() => void onAction('hit')}
              >
                <Plus />
                <strong>Hit</strong>
                <small>Take a card</small>
              </button>
              <button
                className="move-button stand-button"
                disabled={busy || !playing}
                onClick={() => void onAction('stand')}
              >
                <Minus />
                <strong>Stand</strong>
                <small>Keep your hand</small>
              </button>
              <button
                className="move-button"
                disabled={busy || !canExtra}
                onClick={() => void onAction('double')}
              >
                <ArrowDown />
                <strong>Double</strong>
                <small>Double the bet</small>
              </button>
              <button
                className="move-button"
                disabled={
                  busy ||
                  !canExtra ||
                  current?.cards[0].rank !== current?.cards[1].rank ||
                  me.hands.length >= 4
                }
                onClick={() => void onAction('split')}
              >
                <ArrowsSplit />
                <strong>Split</strong>
                <small>Play two hands</small>
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default function GameTable({
  room,
  busy,
  onAction,
  remaining,
  onScore,
}: {
  room: PublicRoom;
  busy: boolean;
  onAction: OnAction;
  remaining: number;
  onScore: () => void;
}) {
  const players = room.players.filter((p) => p.id !== room.dealerId);
  const [compact, setCompact] = useState(false);
  const [seatPage, setSeatPage] = useState(0);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 560px) and (orientation: portrait)');
    const update = () => setCompact(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!compact) return;
    const activeIndex = room.players
      .filter((p) => p.id !== room.dealerId)
      .findIndex((p) => p.id === room.turnId);
    if (activeIndex >= 0) setSeatPage(Math.floor(activeIndex / 3));
  }, [compact, room.turnId, room.dealerId, room.players.length]);
  const paginated = compact && players.length > 3;
  const pageCount = Math.ceil(players.length / 3);
  const page = Math.min(seatPage, pageCount - 1);
  const visiblePlayers = paginated ? players.slice(page * 3, page * 3 + 3) : players;
  const dealer = room.players.find((p) => p.id === room.dealerId);
  const turnPlayer = room.players.find((p) => p.id === room.turnId);
  const results = room.phase === 'results' || room.phase === 'finished';
  const yourTurn = room.turnId === room.you;
  const announcement =
    room.phase === 'finished'
      ? 'The last seat standing'
      : results
        ? 'That’s a hand.'
        : room.phase === 'betting'
          ? 'Place your bets'
          : room.phase === 'dealer'
            ? 'The dealer is up'
            : yourTurn
              ? 'Your move'
              : `${turnPlayer?.name}’s turn`;
  const status = (
    <div className={`table-announcement ${yourTurn ? 'your-move' : ''}`} aria-live="polite">
      <AnimatePresence mode="wait">
        <motion.span
          key={announcement}
          initial={{ opacity: 0, y: 7 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -7 }}
          transition={{ duration: 0.2 }}
        >
          {results ? <Trophy weight="duotone" /> : <i className="status-dot" />}
          {announcement}
        </motion.span>
      </AnimatePresence>
      {!results && (
        <span className={`turn-clock ${remaining <= 8 ? 'urgent' : ''}`}>
          <Timer />
          {remaining}s
        </span>
      )}
    </div>
  );
  return (
    <div className="game-layout">
      <div className="game-main">
        <section
          className={`felt-table seats-${visiblePlayers.length} phase-${room.phase}`}
          aria-label="Blackjack table"
        >
          <div className="felt-rail" />
          <div className="table-corner-label">
            <Spade weight="fill" />
            Private table
          </div>
          <div className="card-shoe" aria-hidden="true">
            <span />
            <span />
            <span>
              <Spade weight="fill" />
            </span>
          </div>
          <div className="dealer-zone">
            <span className={`dealer-name ${room.phase === 'dealer' ? 'is-playing' : ''}`}>
              {dealer ? (
                <Avatar player={dealer} />
              ) : (
                <span className="house-avatar">
                  <Spade weight="fill" />
                </span>
              )}
              <strong>{dealer ? dealer.name : 'The house'}</strong>
              <span>{dealer ? 'Dealer' : 'AI dealer'}</span>
            </span>
            <div className="dealer-cards">
              {room.dealer.length ? (
                <CardFan key={room.round} cards={room.dealer} dealer />
              ) : (
                <div className="empty-dealer-hand">
                  <span>♠</span>
                  <span>♠</span>
                </div>
              )}
            </div>
            {room.dealer.length > 0 && (
              <span
                className={`dealer-score ${score(room.dealer.filter((c) => c !== null)) > 21 ? 'bust' : ''}`}
              >
                {score(room.dealer.filter((c) => c !== null))}
                {room.dealer.includes(null) ? ' + ?' : ''}
              </span>
            )}
          </div>
          <div className="table-center" aria-hidden="true">
            <div className="table-wordmark">
              <strong>twentyone</strong>
            </div>
          </div>
          <div className="player-seats">
            {visiblePlayers.map((player) => (
              <PlayerSeat key={player.id} player={player} room={room} />
            ))}
          </div>
          {paginated && (
            <div className="seat-pagination" aria-label="Player seats">
              <button
                aria-label="Previous player seats"
                disabled={page === 0}
                onClick={() => setSeatPage(page - 1)}
              >
                <CaretLeft />
              </button>
              <span>
                {page * 3 + 1}–{Math.min(page * 3 + 3, players.length)}{' '}
                <small>/ {players.length}</small>
              </span>
              <button
                aria-label="Next player seats"
                disabled={page === pageCount - 1}
                onClick={() => setSeatPage(page + 1)}
              >
                <CaretRight />
              </button>
            </div>
          )}
          <div className="table-bottom-label">
            <span />
            GOOD HANDS. BETTER COMPANY.
            <span />
          </div>
          <button
            className="table-score-button icon-button"
            aria-label="Open table overview"
            onClick={onScore}
          >
            <Users />
          </button>
        </section>
        <div className="table-status-strip" aria-label="Round status">
          <span className="status-table-note">
            <Coins />
            Minimum {format(room.settings.minBet)}
          </span>
          {status}
          <span className="status-table-note">Blackjack pays 3:2</span>
        </div>
        <ActionDock room={room} busy={busy} onAction={onAction} />
      </div>
      <aside className="table-sidebar">
        <div className="rail-heading">
          <h2>At the table</h2>
          <Users />
        </div>
        <Standings room={room} />
        <div className="rail-heading activity-heading">
          <h2>Recent action</h2>
          <i className="status-dot" />
        </div>
        <div className="activity-list">
          {[...room.log]
            .reverse()
            .slice(0, 4)
            .map((entry, index) => (
              <motion.p
                initial={false}
                animate={{ opacity: index === 0 ? 1 : 0.65 }}
                key={entry.id}
              >
                <span />
                {entry.text}
              </motion.p>
            ))}
        </div>
        <button className="button secondary rail-overview" onClick={onScore}>
          Table overview
          <ArrowRight />
        </button>
        <div className="rail-footnote">
          <Spade weight="fill" />
          <span>
            All the thrill.
            <br />
            Just virtual chips.
          </span>
        </div>
      </aside>
    </div>
  );
}
