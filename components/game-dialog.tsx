'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Coins, Crown, Spade, X } from '@phosphor-icons/react';
import type { PublicRoom } from '@/lib/types';
import { AnimatedChips, Avatar } from './game-ui';

export function GameDialog({
  title,
  onClose,
  children,
  className = '',
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('button')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
      if (event.key !== 'Tab') return;
      const items = Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input, select, [tabindex="0"]',
        ) || [],
      );
      const first = items[0],
        last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, []);
  return (
    <motion.div
      className="dialog-scrim"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.section
        ref={ref}
        className={`game-dialog ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ y: 18, scale: 0.96 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 10, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dialog-heading">
          <span>
            <Spade weight="fill" />
            Twentyone club
          </span>
          <button className="icon-button" onClick={onClose} aria-label="Close dialog">
            <X />
          </button>
        </div>
        {children}
      </motion.section>
    </motion.div>
  );
}

const lessons = [
  {
    title: 'Get close. Don’t go over.',
    mark: '21',
    subtitle: 'The goal',
    text: 'Get closer to 21 than the dealer. Go over 21 and you bust. Beat the dealer and you win your bet.',
    detail:
      'Everyone starts with 5,000 chips. Zero chips means elimination. The last player with chips wins.',
  },
  {
    title: 'Know what you’re holding.',
    mark: 'A',
    subtitle: 'Card values',
    text: 'Number cards are worth their number. Jacks, queens, and kings are worth 10. An ace is worth 1 or 11, whichever helps you.',
    detail: 'An ace and a 10-value card on your original two-card hand is a natural blackjack.',
  },
  {
    title: 'Your hand. Your call.',
    mark: '+',
    subtitle: 'Hit, stand & double',
    text: 'Hit to draw another card. Stand to keep your total. Double down on your first two cards to double the bet and receive exactly one more card.',
    detail: 'You need enough chips to double. Buttons light up when a move is available.',
  },
  {
    title: 'Two of a kind? Split.',
    mark: '8 8',
    subtitle: 'Split hands',
    text: 'Matching ranks can be split into two separate hands with equal bets. Play each hand in turn, up to four hands. Tap a hand’s numbered tab to inspect it.',
    detail:
      'Split aces get one card each. A 21 after splitting is a regular win, not a natural blackjack.',
  },
  {
    title: 'Let the chips fall.',
    mark: '3:2',
    subtitle: 'Payouts',
    text: 'Natural blackjack pays 3:2. A regular win pays 1:1. A tie is a push: your bet comes back. Blackjack profits round down to whole chips.',
    detail:
      'In player-dealer mode, the dealer pays wins and collects losses. Bets are limited to what the dealer can cover.',
  },
  {
    title: 'The house has rules, too.',
    mark: '17',
    subtitle: 'Dealers & timers',
    text: 'The dealer hits below 17 and stands on every 17. In player mode, the dealer seat rotates each round. The host deals the next round.',
    detail:
      'When time runs out, a minimum bet is placed, a player stands, or the dealer follows house rules. A dealer who cannot cover a bet may cause a player to sit out.',
  },
];

export function RulesDialog({ onClose }: { onClose: () => void }) {
  const [page, setPage] = useState(0);
  const lesson = lessons[page];
  return (
    <GameDialog title="How to play blackjack" onClose={onClose} className="rules-dialog">
      <div className="rules-body" aria-live="polite">
        <motion.div
          className="lesson-mark"
          key={`mark-${page}`}
          initial={{ rotate: -8, scale: 0.9 }}
          animate={{ rotate: -5, scale: 1 }}
        >
          {lesson.mark}
          <Spade weight="fill" />
        </motion.div>
        <span className="overline">{lesson.subtitle}</span>
        <h2>{lesson.title}</h2>
        <p>{lesson.text}</p>
        <div className="lesson-detail">{lesson.detail}</div>
      </div>
      <div className="dialog-footer">
        <button
          className="icon-button bordered"
          aria-label="Previous rule"
          disabled={page === 0}
          onClick={() => setPage(page - 1)}
        >
          <ArrowLeft />
        </button>
        <div className="page-dots">
          {lessons.map((item, i) => (
            <button
              key={item.title}
              aria-label={`Rule ${i + 1}: ${item.subtitle}`}
              aria-current={i === page ? 'step' : undefined}
              className={i === page ? 'selected' : ''}
              onClick={() => setPage(i)}
            />
          ))}
        </div>
        <button
          className="button primary"
          onClick={() => (page === lessons.length - 1 ? onClose() : setPage(page + 1))}
        >
          {page === lessons.length - 1 ? 'Let’s play' : 'Next'}
          <ArrowRight />
        </button>
      </div>
    </GameDialog>
  );
}

export function Standings({
  room,
  page = 0,
  pageSize = 6,
}: {
  room: PublicRoom;
  page?: number;
  pageSize?: number;
}) {
  return (
    <div className="standings">
      {[...room.players]
        .sort((a, b) => b.chips - a.chips)
        .slice(page * pageSize, (page + 1) * pageSize)
        .map((player, index) => (
          <div
            key={player.id}
            className={`standing ${player.eliminated ? 'out' : ''} ${player.id === room.you ? 'is-you' : ''}`}
          >
            <span className="standing-rank">
              {index === 0 && page === 0 ? <Crown weight="fill" /> : page * pageSize + index + 1}
            </span>
            <Avatar player={player} />
            <div>
              <strong>
                {player.name}
                {player.id === room.you && <small> you</small>}
              </strong>
              <span>
                {player.eliminated
                  ? 'Eliminated'
                  : player.id === room.dealerId
                    ? 'Dealer'
                    : player.bot
                      ? 'Computer'
                      : 'Player'}
              </span>
            </div>
            <b>
              <AnimatedChips value={player.chips} />
            </b>
          </div>
        ))}
    </div>
  );
}

export function ScoreDialog({ room, onClose }: { room: PublicRoom; onClose: () => void }) {
  const [tab, setTab] = useState<'players' | 'activity'>('players');
  const [page, setPage] = useState(0);
  const [playerPage, setPlayerPage] = useState(0);
  const entries = [...room.log].reverse();
  const currentPage = tab === 'players' ? playerPage : page;
  const pageCount = Math.max(
    1,
    Math.ceil(tab === 'players' ? room.players.length / 3 : entries.length / 2),
  );
  const changePage = (next: number) => (tab === 'players' ? setPlayerPage(next) : setPage(next));
  return (
    <GameDialog title="Table overview" onClose={onClose} className="score-dialog">
      <h2>Your table</h2>
      <div className="segmented">
        <button className={tab === 'players' ? 'selected' : ''} onClick={() => setTab('players')}>
          Players
        </button>
        <button className={tab === 'activity' ? 'selected' : ''} onClick={() => setTab('activity')}>
          Recent action
        </button>
      </div>
      <div className="score-dialog-content">
        {tab === 'players' ? (
          <Standings room={room} page={playerPage} pageSize={3} />
        ) : (
          <div className="activity-list">
            {entries.slice(page * 2, page * 2 + 2).map((entry) => (
              <p key={entry.id}>
                <span />
                {entry.text}
              </p>
            ))}
          </div>
        )}
      </div>
      <div className="dialog-footer">
        <span className="subtle">
          <Coins />
          Virtual chips only
        </span>
        <div className="pager">
          <button
            className="icon-button bordered"
            aria-label={tab === 'players' ? 'Previous players' : 'Newer activity'}
            disabled={!currentPage}
            onClick={() => changePage(currentPage - 1)}
          >
            <ArrowLeft />
          </button>
          <span>
            {currentPage + 1} / {pageCount}
          </span>
          <button
            className="icon-button bordered"
            aria-label={tab === 'players' ? 'Next players' : 'Older activity'}
            disabled={currentPage + 1 >= pageCount}
            onClick={() => changePage(currentPage + 1)}
          >
            <ArrowRight />
          </button>
        </div>
      </div>
    </GameDialog>
  );
}
