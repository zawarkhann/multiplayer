import React, { useEffect } from 'react';

export default function Unauthorized() {
  // fire once on mount
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
    <div
      style={{
        backgroundColor: 'black',
        color: 'white',
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '2rem',
      }}
    >
      ❌ Unauthorized Access.
    </div>
  );
}
