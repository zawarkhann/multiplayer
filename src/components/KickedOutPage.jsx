import React, { useEffect } from 'react';

const KickedOutPage = () => {
  useEffect(() => {
    console.warn('You have been kicked out of the meeting');
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      window.parent.postMessage(
        {
          type: 'REDIRECT_AMJAD_APP',
          message: 'eventEnded',
        },
        '*',
      );
      console.log('MEssage sent');
    }, 2000); // 2 000 ms = 2 seconds

    // clean-up in case the component unmounts before the timeout
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className='min-h-screen flex items-center justify-center bg-black text-white px-4'>
      <div className='text-center'>
        {/* Red Cross Icon */}
        <div className='text-5xl mb-4 text-red-500'>❌</div>

        <p>The host has removed you from the meeting.</p>
        <p>You can no longer rejoin this session.</p>
        {/* Return Home Button */}
        <button
          onClick={() =>
            (window.location.href =
              'https://amjad-pod-frontend.tenant-7654b5-asrpods.ord1.ingress.coreweave.cloud/')
          }
          className='bg-red-500 hover:bg-red-600 text-white px-6 mt-10 py-2 rounded-full text-sm font-medium transition'
        >
          Return to Home
        </button>
      </div>
    </div>
  );
};

export default KickedOutPage;
