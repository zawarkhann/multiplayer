// src/components/HostLeft.jsx
import React, { useEffect } from 'react';

export default function HostLeft() {
 
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
      ❌ The host has left the meeting Or ⏰ Meeting Time has Expired.
    </div>
  );
}
