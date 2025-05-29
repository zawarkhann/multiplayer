// import React, { useEffect, useState } from 'react';
// import { useNavigate } from 'react-router-dom';

// const EVENT_DURATION = 3600; // seconds (2 min) – change if you really want 500 s

// export default function TimerBubble() {
//   const navigate = useNavigate();

//   const [remaining, setRemaining] = useState(0);
//   const [eventEnded, setEventEnded] = useState(false); // ← external code can flip this too

//   /* ── 1. countdown loop ─────────────────────────────────────────────── */
//   useEffect(() => {
//     /* host’s start stamp (secs-since-epoch) */
//     const start = Number(window.eventStartedTime) || Math.floor(Date.now() / 1000);
//     const end = start + EVENT_DURATION;

//     const tick = () => {
//       const now = Math.floor(Date.now() / 1000);
//       const left = end - now;

//       if (left <= 0) {
//         setRemaining(0);
//         setEventEnded(true); // ← triggers redirect in hook below
//       } else {
//         setRemaining(left);
//       }
//     };

//     tick(); // first run right away
//     const id = setInterval(tick, 1000); // …then every second
//     return () => clearInterval(id);
//   }, []);

//   /* ── 2. react when the meeting ends ────────────────────────────────── */
//   useEffect(() => {
//     if (!eventEnded) return;

//     // A. broadcast (for anyone else who’s listening)
//     window.dispatchEvent(new Event('MeetingEnded'));

//     // B. navigate once
//     navigate('/time-up', { replace: true });
//   }, [eventEnded, navigate]);

//   /* ── 3. helper: mm:ss ──────────────────────────────────────────────── */
//   const fmt = (s) =>
//     `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

//   /* ── 4. finished? render nothing ───────────────────────────────────── */
//   if (eventEnded) return null;

//   /* ── 5. bubble UI ──────────────────────────────────────────────────── */
//   return (
//     <div
//       className='fixed left-1/2 -translate-x-1/2 top-[8%] z-50
//                     rounded-full bg-[#2e2c2c] px-4 py-1 text-sm font-medium
//                     text-white'
//     >
//       {fmt(remaining)}
//     </div>
//   );
// }
