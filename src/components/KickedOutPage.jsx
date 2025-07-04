import React, { useEffect } from 'react';

const KickedOutPage = () => {
  useEffect(() => {
    console.warn('You have been kicked out of the meeting');
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
          
          className='bg-red-500 hover:bg-red-600 text-white px-6 mt-10 py-2 rounded-full text-sm font-medium transition'
        >
          Return to Home
        </button>
      </div>
    </div>
  );
};

export default KickedOutPage;
