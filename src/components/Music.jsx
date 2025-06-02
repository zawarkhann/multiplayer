import React, { useEffect, useRef, useState } from 'react';

const fallbackUrl =
  'https://file-examples.com/storage/fe17a1467f68237299aa605/2017/11/file_example_MP3_700KB.mp3';

export default function Music({ soundUrl, top = '8%' }) {
  const audioRef = useRef(null);
  const [muted, setMuted] = useState(true);
  const [audioLoaded, setAudioLoaded] = useState(false);
  console.log('HELLO URL', soundUrl);

  useEffect(() => {
    const finalUrl = soundUrl === 'https://sound_url.com/' || !soundUrl ? fallbackUrl : soundUrl;

    fetch(finalUrl, { mode: 'cors' })
      .then((res) => res.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        if (audioRef.current) {
          audioRef.current.src = blobUrl;
          setAudioLoaded(true);
        }
      })
      .catch((err) => {
        console.error('Error loading audio:', err);
      });
  }, [soundUrl]);

  const toggleAudio = async () => {
    if (!audioLoaded || !audioRef.current) return;

    if (muted) {
      audioRef.current.muted = false;
      try {
        await audioRef.current.play();
        setMuted(false);
      } catch (err) {
        console.error('Playback failed:', err);
      }
    } else {
      audioRef.current.muted = true;
      audioRef.current.pause();
      setMuted(true);
    }
  };

  return (
    <>
      <audio
        ref={audioRef}
        loop
        muted
        style={{ display: 'none' }}
        playsInline
        crossOrigin='anonymous'
      />
      <div
        className='fixed z-50 right-[3%] p-3 bg-[#2D2E2E] bg-opacity-80 rounded-full cursor-pointer hover:scale-105 transition-transform'
        style={{ top }}
        onClick={toggleAudio}
      >
        <img
          src={muted ? '/musicoff.svg' : '/musicon.svg'}
          alt='Toggle Audio'
          className='w-4 h-4'
        />
      </div>
    </>
  );
}
