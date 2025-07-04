import React, { useEffect } from 'react';

export default function Unauthorized() {
  // fire once on mount


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
