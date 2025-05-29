import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function AudioVideo() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  // ─── initial state from URL ─────────────────────────────
  // Default both to enabled when first visiting page
  const [audio, setAudio] = useState(params.get('audio') === 'disabled' ? false : true);
  const [cam, setCam] = useState(params.get('video') === 'disabled' ? false : true);

  // Set initial values if not present
  useEffect(() => {
    if (!params.has('audio')) {
      updateQuery('audio', 'enabled');
    }
    if (!params.has('video')) {
      updateQuery('video', 'enabled');
    }
  }, []);

  /* helper that mutates the query-string *and* replaces history */
  const updateQuery = (key, value) => {
    const p = new URLSearchParams(location.search);
    p.set(key, value);
    navigate({ pathname: location.pathname, search: p.toString() }, { replace: true });
  };

  // keep URL in sync when toggles change
  useEffect(() => {
    updateQuery('audio', audio ? 'enabled' : 'disabled');
  }, [audio]);

  useEffect(() => {
    updateQuery('video', cam ? 'enabled' : 'disabled');
  }, [cam]);

  // ─── handlers ───────────────────────────────────────────
  const handleBack = () => {
    // Go back to avatar selection by setting step=avatar
    const newParams = new URLSearchParams(params);
    newParams.set('step', 'avatar');
    navigate(`/?${newParams.toString()}`);
  };

  const handleJoin = () => {
    // Remove step parameter and navigate to root with all other parameters
    const newParams = new URLSearchParams(params);
    newParams.delete('step'); // Remove step parameter when completing the flow
    navigate(`/?${newParams.toString()}`);
  };

  // ─── UI ─────────────────────────────────────────────────
  return (
    <div className='h-screen w-screen flex flex-col bg-[#191B1A] text-white'>
      {/* 10 % header */}
      <header className='flex items-center space-x-3 px-4' style={{ flex: '0 0 10%' }}>
        <button
          onClick={handleBack}
          className='flex items-center justify-center p-2 rounded-full bg-[#2D2E2E] hover:bg-[#404241] transition-colors'
        >
          <img src='/back.png' alt='back' className='w-4 h-4' />
        </button>
        <span className='text-lg font-medium'>Check your audio&nbsp;&amp;&nbsp;video</span>
      </header>

      {/* 15 % mic switch */}
      <section className='px-4' style={{ flex: '0 0 15%' }}>
        <label className='flex items-center justify-between h-full border-b border-[#2D2E2E]'>
          <div>
            <p className='font-medium'>Turn on microphone</p>
            <p className='text-xs text-[#7F7F7F] mt-1'>
              Make sure your microphone is on for smooth communication.
            </p>
          </div>
          <div className='relative'>
            <input
              type='checkbox'
              checked={audio}
              onChange={() => setAudio(!audio)}
              className='w-11 h-6 rounded-full bg-gray-400 peer appearance-none
                         checked:bg-violet-500 transition-all relative cursor-pointer'
            />
            <span className='peer-checked:translate-x-5 absolute left-1 top-1 bg-white h-4 w-4 rounded-full transition-transform'></span>
          </div>
        </label>
      </section>

      {/* 15 % camera switch */}
      <section className='px-4' style={{ flex: '0 0 15%' }}>
        <label className='flex items-center justify-between h-full border-b border-[#2D2E2E]'>
          <div>
            <p className='font-medium'>Turn on camera</p>
            <p className='text-xs text-[#7F7F7F] mt-1'>
              Turn on your camera for a more engaging meeting experience.
            </p>
          </div>
          <div className='relative'>
            <input
              type='checkbox'
              checked={cam}
              onChange={() => setCam(!cam)}
              className='w-11 h-6 rounded-full bg-gray-400 peer appearance-none
                         checked:bg-violet-500 transition-all relative cursor-pointer'
            />
            <span className='peer-checked:translate-x-5 absolute left-1 top-1 bg-white h-4 w-4 rounded-full transition-transform'></span>
          </div>
        </label>
      </section>

      {/* blank spacer (from 40 % up to 75 %) */}
      <div style={{ flex: '0 0 35%' }} />

      {/* 25 % – Join Now button sits after the 75 % mark */}
      <footer className='flex items-center px-6' style={{ flex: '0 0 25%' }}>
        <button
          onClick={handleJoin}
          className='w-full py-3 bg-[#8F5BFF] rounded-2xl text-base font-semibold'
        >
          Join&nbsp;Now
        </button>
      </footer>
    </div>
  );
}
