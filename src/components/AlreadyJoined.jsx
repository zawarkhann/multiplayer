// src/components/HostLeft.jsx
import React, { useEffect } from 'react';

export default function Alreadyjoined() {

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
      ❌ Room Limit Exceeded. Max 5 Players Allowed
    </div>
  );
}
