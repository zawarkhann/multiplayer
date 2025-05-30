import React, { useEffect } from 'react';
import loadingGif from '/public/images/pods logo animaton (1).gif'; // put the file in src/images

export default function LoadingScreen({ isVisible, onHide }) {
  useEffect(() => {
    if (!isVisible && onHide) {
      const t = setTimeout(onHide, 500);
      return () => clearTimeout(t);
    }
  }, [isVisible, onHide]);

  if (!isVisible) return null;
  ///////////////////

  return (
    <div
      /* 100 vh area, dark backdrop, centred content, on top of everything */
      className='fixed inset-0 grid place-items-center bg-[#2d2e2e] z-50'
    >
      {/* centred GIF */}
      <img src={loadingGif} alt='Loading…' className='w-32 h-auto' /* 8 rem wide → 128 px */ />
    </div>
  );
}

//////
