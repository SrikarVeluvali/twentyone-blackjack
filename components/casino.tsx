'use client';

import { useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import {
  ArrowRight,
  CheckCircle,
  Coins,
  Copy,
  DoorOpen,
  House,
  Info,
  LinkSimple,
  Moon,
  Plus,
  ShieldCheck,
  Spade,
  SpeakerHigh,
  SpeakerSlash,
  Sun,
  Trophy,
  Users,
  WifiHigh,
  X,
} from '@phosphor-icons/react';
import Lobby from './lobby';
import GameTable from './game-table';
import { GameDialog, RulesDialog, ScoreDialog } from './game-dialog';
import { Chip, PlayingCard } from './game-ui';
import { useCasino } from './use-casino';

export default function Casino() {
  const game = useCasino();
  const [dialog, setDialog] = useState<'rules' | 'score' | 'leave' | null>(null);
  const {
    room,
    view,
    setView,
    name,
    setName,
    code,
    setCode,
    tab,
    setTab,
    busy,
    error,
    setError,
    toast,
    sound,
    online,
    theme,
    toggleTheme,
    toggleSound,
    enter,
    action,
    copy,
    remaining,
  } = game;
  const atTable = view === 'table' && room;
  const screen = atTable ? (room.phase === 'lobby' ? 'lobby' : 'game') : 'lounge';
  const scene = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -5 },
    transition: { duration: 0.22 },
  };
  return (
    <MotionConfig reducedMotion="user">
      <div className={`casino-app screen-${screen}`} data-theme={theme}>
        <header className="game-header">
          <button className="brand" aria-label="Twentyone lounge" onClick={() => setView('lounge')}>
            <span className="brand-emblem">
              <Spade weight="fill" />
            </span>
            <span>
              twenty<span>one</span>
              <small>THE BLACKJACK CLUB</small>
            </span>
          </button>
          <nav className="main-nav" aria-label="Main navigation">
            <button
              aria-label="Lounge"
              className={!atTable ? 'selected' : ''}
              onClick={() => setView('lounge')}
            >
              <House weight={!atTable ? 'fill' : 'regular'} />
              <span>Lounge</span>
            </button>
            <button
              aria-label="Your table"
              className={atTable ? 'selected' : ''}
              onClick={() => {
                if (room) setView('table');
                else document.getElementById('player-name')?.focus();
              }}
            >
              <Users weight={atTable ? 'fill' : 'regular'} />
              <span>Your table</span>
              {room && <i className="status-dot" />}
            </button>
          </nav>
          <div className="header-tools">
            <span className="virtual-badge">
              <ShieldCheck />
              Just virtual chips
            </span>
            <button
              className="icon-button rules-button"
              onClick={() => setDialog('rules')}
              aria-label="How to play"
            >
              <Info />
            </button>
            <button
              className="icon-button"
              onClick={toggleSound}
              aria-label={sound ? 'Mute sounds' : 'Enable sounds'}
              aria-pressed={sound}
            >
              {sound ? <SpeakerHigh /> : <SpeakerSlash />}
            </button>
            <button
              className="icon-button theme-toggle"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {theme === 'dark' ? <Sun weight="duotone" /> : <Moon weight="duotone" />}
            </button>
          </div>
        </header>
        <main className="game-viewport">
          <AnimatePresence mode="wait" initial={false}>
            {atTable ? (
              <motion.div
                key={screen}
                {...scene}
                className={`table-screen ${room.phase === 'lobby' ? 'is-lobby' : 'is-game'}`}
              >
                <div className="session-bar">
                  <div className="session-identity">
                    <span
                      className={`connection-dot ${online ? '' : 'offline'}`}
                      title={online ? 'Connected' : 'Reconnecting'}
                    />
                    <h1>{room.phase === 'lobby' ? 'Your private table' : `Round ${room.round}`}</h1>
                    <button
                      className="room-code"
                      onClick={() => void copy()}
                      aria-label={`Copy room code ${room.code}`}
                    >
                      {room.code}
                      <Copy />
                    </button>
                    <span className="session-mode">
                      {room.phase === 'lobby'
                        ? 'Waiting room'
                        : room.settings.mode === 'ai'
                          ? 'House dealer'
                          : 'Player dealer'}
                    </span>
                  </div>
                  <div className="session-tools">
                    <button
                      className="button secondary invite-button"
                      onClick={() => void copy(true)}
                      aria-label="Copy invite link"
                    >
                      <LinkSimple />
                      <span>Invite friends</span>
                    </button>
                    <button
                      className="button danger table-exit"
                      disabled={busy}
                      onClick={() =>
                        room.phase === 'lobby' ? void action('leave') : setDialog('leave')
                      }
                    >
                      <DoorOpen />
                      <span>Leave table</span>
                    </button>
                  </div>
                </div>
                {room.phase === 'lobby' ? (
                  <Lobby room={room} busy={busy} onAction={action} onCopy={() => void copy(true)} />
                ) : (
                  <GameTable
                    room={room}
                    busy={busy}
                    onAction={action}
                    remaining={remaining}
                    onScore={() => setDialog('score')}
                  />
                )}
              </motion.div>
            ) : (
              <motion.div key="lounge" {...scene} className="lounge-screen">
                <section className="lounge-scene">
                  <div className="lounge-copy">
                    <div className="club-label">
                      <span />A seat for your kind of people
                      <span />
                    </div>
                    <h1>
                      Good company.
                      <br />
                      Great hands.
                    </h1>
                    <p>
                      Blackjack nights start here.
                      <br />
                      Bring your friends. Play your hand.
                    </p>
                  </div>
                  <div className="lounge-art" aria-label="An ace and a jack make twenty-one">
                    <div className="art-ring ring-outer" />
                    <div className="art-ring ring-inner" />
                    <span className="art-suit suit-club">♣</span>
                    <span className="art-suit suit-diamond">♦</span>
                    <motion.div
                      className="showcase-card showcase-jack"
                      initial={{ rotate: 0, x: -30, opacity: 0 }}
                      animate={{ rotate: 15, x: 0, opacity: 1 }}
                      transition={{ type: 'spring', damping: 22, delay: 0.12 }}
                    >
                      <PlayingCard
                        decorative
                        card={{ rank: 'J', suit: '♣', id: 'showcase-jack' }}
                      />
                    </motion.div>
                    <motion.div
                      className="showcase-card showcase-ace"
                      initial={{ rotate: 0, x: 30, opacity: 0 }}
                      animate={{ rotate: -14, x: 0, opacity: 1 }}
                      transition={{ type: 'spring', damping: 22, delay: 0.22 }}
                    >
                      <PlayingCard decorative card={{ rank: 'A', suit: '♠', id: 'showcase-ace' }} />
                    </motion.div>
                    <span className="showcase-chip chip-first">
                      <Chip value={100} />
                    </span>
                    <span className="showcase-chip chip-second">
                      <Chip value={500} />
                    </span>
                    <div className="twentyone-stamp">
                      <strong>21</strong>
                      <span>
                        THE PERFECT
                        <br />
                        NIGHT IN
                      </span>
                    </div>
                  </div>
                  <div className="lounge-caption">
                    <Spade weight="fill" />
                    <span>Your friends. Your table. Your lucky night.</span>
                  </div>
                </section>
                <section className="entry-panel panel">
                  <div className="entry-heading">
                    <span className="overline">Pull up a chair</span>
                    <h2>{room ? 'Your table is waiting.' : 'Make it a game night.'}</h2>
                    <p>
                      {room
                        ? 'Your seat is saved. Pick up where you left off.'
                        : 'A private table, a familiar crowd.'}
                    </p>
                  </div>
                  {room ? (
                    <div className="resume-content">
                      <span className="resume-emblem">
                        <Spade weight="fill" />
                      </span>
                      <strong>{room.code}</strong>
                      <span>
                        {room.players.length} players ·{' '}
                        {room.phase === 'lobby' ? 'In the lobby' : `Round ${room.round}`}
                      </span>
                      <button className="button primary full" onClick={() => setView('table')}>
                        Return to your table
                        <ArrowRight />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="segmented entry-tabs">
                        <button
                          className={tab === 'create' ? 'selected' : ''}
                          aria-pressed={tab === 'create'}
                          onClick={() => setTab('create')}
                        >
                          <Plus />
                          Create table
                        </button>
                        <button
                          className={tab === 'join' ? 'selected' : ''}
                          aria-pressed={tab === 'join'}
                          onClick={() => setTab('join')}
                        >
                          <Users />
                          Join friends
                        </button>
                      </div>
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          void enter();
                        }}
                        className="entry-form"
                      >
                        <label htmlFor="player-name">
                          Your name at the table
                          <input
                            id="player-name"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder="What should we call you?"
                            maxLength={20}
                            required
                            autoComplete="nickname"
                          />
                        </label>
                        {tab === 'join' && (
                          <motion.label
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            htmlFor="room-code"
                          >
                            Room code
                            <input
                              id="room-code"
                              value={code}
                              onChange={(event) => setCode(event.target.value.toUpperCase())}
                              className="code-input"
                              placeholder="ABC123"
                              minLength={6}
                              maxLength={6}
                              required
                              autoComplete="off"
                              autoCapitalize="characters"
                            />
                          </motion.label>
                        )}
                        <button className="button primary full" type="submit" disabled={busy}>
                          {busy ? (
                            <>
                              <span className="loading-ring" />
                              Finding your seat…
                            </>
                          ) : (
                            <>
                              {tab === 'create' ? 'Create private table' : 'Join the table'}
                              <ArrowRight />
                            </>
                          )}
                        </button>
                      </form>
                    </>
                  )}
                  <div className="entry-details">
                    <span>
                      <Coins weight="duotone" />
                      <strong>5,000</strong> starting chips
                    </span>
                    <span>
                      <Users weight="duotone" />
                      Up to <strong>6</strong> players
                    </span>
                    <span>
                      <Trophy weight="duotone" />
                      Last player wins
                    </span>
                  </div>
                  <button className="learn-button" onClick={() => setDialog('rules')}>
                    <Info />
                    New to blackjack?
                    <span>
                      Learn to play
                      <ArrowRight />
                    </span>
                  </button>
                  <div className="entry-footnote">
                    <ShieldCheck />
                    No sign-up. No real money.
                  </div>
                </section>
                <div className="lounge-bottom">
                  <span>
                    <WifiHigh />
                    Built for a good night together.
                  </span>
                  <button onClick={() => setDialog('rules')}>
                    House rules
                    <ArrowRight />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
        <footer className="creator-credit">
          Made by <strong>Srikar Veluvali</strong>
        </footer>
        <AnimatePresence>
          {error && (
            <motion.div
              className="toast error-toast"
              role="alert"
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Info />
              <span>{error}</span>
              <button
                className="icon-button"
                aria-label="Dismiss error"
                onClick={() => setError('')}
              >
                <X />
              </button>
            </motion.div>
          )}
          {toast && (
            <motion.div
              className="toast success-toast"
              role="status"
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <CheckCircle />
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {dialog === 'rules' && <RulesDialog key="rules" onClose={() => setDialog(null)} />}
          {dialog === 'score' && room && (
            <ScoreDialog key="score" room={room} onClose={() => setDialog(null)} />
          )}
          {dialog === 'leave' && (
            <GameDialog
              key="leave"
              title="Leave the table"
              onClose={() => setDialog(null)}
              className="leave-dialog"
            >
              <span className="leave-emblem">
                <DoorOpen />
              </span>
              <h2>Taking a breather?</h2>
              <p>
                You can return to the lounge now. Your seat stays saved, and your turns will time
                out while you’re away.
              </p>
              <div className="leave-explanation">
                <Info />
                To fully leave your seat, return to the lobby between rounds. The host can open the
                lobby after a hand finishes.
              </div>
              <div className="dialog-footer">
                <button className="button secondary" onClick={() => setDialog(null)}>
                  Keep playing
                </button>
                <button
                  className="button danger"
                  onClick={() => {
                    setDialog(null);
                    setView('lounge');
                  }}
                >
                  <DoorOpen />
                  Go to lounge
                </button>
              </div>
            </GameDialog>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
