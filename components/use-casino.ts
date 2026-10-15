'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PublicRoom } from '@/lib/types';

export function useCasino() {
  const [room, setRoom] = useState<PublicRoom | null>(null);
  const [token, setToken] = useState('');
  const [view, setView] = useState<'lounge' | 'table'>('lounge');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [sound, setSound] = useState(false);
  const [online, setOnline] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const roomRef = useRef<PublicRoom | null>(null);
  const tokenRef = useRef('');
  const audioRef = useRef<AudioContext | null>(null);
  const clockOffset = useRef(0);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);
  const update = useCallback((next: PublicRoom) => {
    clockOffset.current = next.serverNow - Date.now();
    setRoom((prev) =>
      !prev || next.code !== prev.code || next.version >= prev.version ? next : prev,
    );
  }, []);

  useEffect(() => {
    const storedName = localStorage.getItem('twentyone-name');
    if (storedName) setName(storedName);
    setTheme(localStorage.getItem('twentyone-theme') === 'light' ? 'light' : 'dark');
    setSound(localStorage.getItem('twentyone-sound') === 'on');
    const join = new URLSearchParams(location.search).get('room');
    if (join) {
      setCode(join.toUpperCase());
      setTab('join');
    }
    const saved = sessionStorage.getItem('twentyone-seat');
    if (saved)
      try {
        const data = JSON.parse(saved);
        tokenRef.current = data.token;
        setToken(data.token);
        fetch(`/api/rooms?code=${data.code}`, {
          headers: { Authorization: `Bearer ${data.token}` },
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.room) {
              update(data.room);
              setView('table');
            } else sessionStorage.removeItem('twentyone-seat');
          })
          .catch(() => setError('Could not reconnect. Check your connection and refresh.'));
      } catch {
        sessionStorage.removeItem('twentyone-seat');
      }
  }, [update]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(timeout);
  }, [toast]);
  useEffect(() => {
    if (!room?.code || !token) return;
    let stopped = false,
      fetching = false;
    const poll = async () => {
      if (fetching) return;
      fetching = true;
      try {
        const response = await fetch(`/api/rooms?code=${room.code}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const data = await response.json();
        if (stopped) return;
        if (data.room) {
          update(data.room);
          setOnline(true);
        } else {
          setError(data.error);
          setOnline(false);
        }
      } catch {
        if (!stopped) setOnline(false);
      } finally {
        fetching = false;
      }
    };
    const interval = setInterval(poll, 1000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [room?.code, token, update]);

  function chime() {
    if (!sound) return;
    try {
      audioRef.current ??= new window.AudioContext();
      const ctx = audioRef.current;
      void ctx.resume();
      const oscillator = ctx.createOscillator(),
        gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.setValueAtTime(660, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.035, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.2);
    } catch {
      /* Audio is optional. */
    }
  }

  async function enter() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: tab, name, code: code.toUpperCase().replace(/\s/g, '') }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      tokenRef.current = data.token;
      setToken(data.token);
      update(data.room);
      setView('table');
      sessionStorage.setItem(
        'twentyone-seat',
        JSON.stringify({ token: data.token, code: data.room.code }),
      );
      localStorage.setItem('twentyone-name', name);
      chime();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function action(type: string, extra: Record<string, unknown> = {}) {
    if (!roomRef.current || busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenRef.current}`,
        },
        body: JSON.stringify({ code: roomRef.current.code, action: { type, ...extra } }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (type === 'leave') {
        setRoom(null);
        setToken('');
        setView('lounge');
        sessionStorage.removeItem('twentyone-seat');
      } else update(data.room);
      chime();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function copy(link = false) {
    if (!room) return;
    const value = link ? `${location.origin}/?room=${room.code}` : room.code;
    try {
      await navigator.clipboard.writeText(value);
      setToast(link ? 'Invite link copied' : 'Room code copied');
    } catch {
      setToast(`Room code: ${room.code}`);
    }
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('twentyone-theme', next);
  }
  function toggleSound() {
    setSound(!sound);
    localStorage.setItem('twentyone-sound', !sound ? 'on' : 'off');
  }
  const remaining = room?.deadline
    ? Math.min(
        room.settings.turnSeconds,
        Math.max(0, Math.ceil((room.deadline - now - clockOffset.current) / 1000)),
      )
    : 0;
  return {
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
    setToast,
    sound,
    online,
    theme,
    toggleTheme,
    toggleSound,
    enter,
    action,
    copy,
    remaining,
  };
}
