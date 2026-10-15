'use client';

import { useEffect } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { Robot, Spade } from '@phosphor-icons/react';
import type { Card, Player } from '@/lib/types';

export const format = (n: number) => n.toLocaleString('en-US');
export type OnAction = (type: string, extra?: Record<string, unknown>) => Promise<void>;

export function score(cards: Card[]) {
  let value = 0,
    aces = 0;
  for (const card of cards) {
    value += card.rank === 'A' ? 11 : ['K', 'Q', 'J'].includes(card.rank) ? 10 : Number(card.rank);
    if (card.rank === 'A') aces++;
  }
  while (value > 21 && aces) {
    value -= 10;
    aces--;
  }
  return value;
}

export function AnimatedChips({ value }: { value: number }) {
  const count = useMotionValue(value);
  const display = useTransform(count, (n) => format(Math.round(n)));
  const reduced = useReducedMotion();
  useEffect(() => {
    const controls = animate(count, value, { duration: reduced ? 0 : 0.65, ease: 'easeOut' });
    return () => controls.stop();
  }, [count, value, reduced]);
  return <motion.span aria-label={`${format(value)} chips`}>{display}</motion.span>;
}

export function PlayingCard({
  card,
  index = 0,
  decorative = false,
}: {
  card: Card | null;
  index?: number;
  decorative?: boolean;
}) {
  const red = card?.suit === '♥' || card?.suit === '♦';
  return (
    <motion.div
      className={`playing-card ${red ? 'red' : ''}`}
      initial={decorative ? false : { opacity: 0, x: 30, y: -55, rotate: -14, scale: 0.85 }}
      animate={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 240,
        damping: 24,
        delay: decorative ? 0 : Math.min(index * 0.07, 0.35),
      }}
      aria-label={
        card
          ? `${card.rank} of ${{ '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs' }[card.suit]}`
          : 'Face-down card'
      }
    >
      <motion.div
        className="card-flipper"
        animate={{ rotateY: card ? 0 : 180 }}
        transition={{ duration: 0.48, ease: [0.2, 0.7, 0.3, 1] }}
      >
        <div className="card-front">
          {card && (
            <>
              <span className="card-corner">
                {card.rank}
                <small>{card.suit}</small>
              </span>
              <span className="card-suit">{card.suit}</span>
              <span className="card-corner bottom">
                {card.rank}
                <small>{card.suit}</small>
              </span>
            </>
          )}
        </div>
        <div className="card-back">
          <span>
            <Spade weight="fill" />
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function CardFan({ cards, dealer = false }: { cards: (Card | null)[]; dealer?: boolean }) {
  return (
    <div
      className={`card-fan ${dealer ? 'dealer-fan' : ''}`}
      style={{
        width: `calc(var(--card-w) + ${Math.max(0, cards.length - 1)} * var(--card-spread))`,
      }}
    >
      {cards.map((card, index) => (
        <div className="fan-slot" key={dealer ? `dealer-${index}` : card?.id || index}>
          <PlayingCard card={card} index={index} />
        </div>
      ))}
    </div>
  );
}

export function Chip({ value, small = false }: { value: number; small?: boolean }) {
  return (
    <span className={`chip chip-${value} ${small ? 'small' : ''}`} aria-hidden="true">
      <span>{value >= 1000 ? `${value / 1000}k` : value}</span>
    </span>
  );
}

export function Avatar({ player }: { player: Pick<Player, 'name' | 'bot' | 'id'> }) {
  const color = ['sage', 'peach', 'blue', 'gold'][player.name.charCodeAt(0) % 4];
  return (
    <span className={`avatar ${color}`}>
      {player.bot ? <Robot weight="duotone" /> : player.name.slice(0, 2).toUpperCase()}
    </span>
  );
}
