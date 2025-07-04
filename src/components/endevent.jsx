import React, { useEffect } from 'react';



export const handleFinishEvent = async () => {
  console.log("Event finished");
  
  // Redirect to Google immediately when event is finished
  window.location.href = 'https://google.com/';
};

const EndEventPrompt = ({ isOpen, isHost, onCancel }) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    // Any user can finish the event and redirect
    handleFinishEvent();
    
    
  };
  useEffect(() => {
    window.hideJoystick = true;
  }, []);

  return (
    <div className='fixed inset-0 bg-black/80 flex items-center justify-center z-50'>
      <div className='bg-[#2F2F2F] rounded-xl w-[90vw] max-w-sm p-5 pt-10 text-center relative'>
        {/* Cross Button inside box */}
        <button
          onClick={onCancel}
          className='absolute top-3 right-3 text-white text-xl leading-none focus:outline-none'
        >
          &times;
        </button>

        {/* Heading */}
        <h2 className='text-white text-lg font-semibold mb-3'>
          {/* {isHost ? 'End Event?' : 'Leave Event?'} */}
          {isHost ? 'Leave Event?' : 'Leave Event?'}
        </h2>

        {/* Message */}
        <p className='text-[#CCCCCC] mr-[10%] ml-[10%] text-sm mb-6 text-center leading-relaxed'>
          {/* {isHost
            ? 'Are you sure you want to end the event? All participants will be disconnected, and the event will be closed.'
            : 'Are you sure you want to leave the event? You’ll be disconnected from the session.'} */}
          {isHost
            ? 'Are you sure you want to leave the event? You’ll be disconnected from the session.'
            : 'Are you sure you want to leave the event? You’ll be disconnected from the session.'}
        </p>

        {/* Confirm Button */}
        <button
          onClick={handleConfirm}
          className='bg-[#FF5656] text-white w-[60%] py-2 rounded-full text-sm font-medium mb-3'
        >
          {isHost ? 'End Event' : 'Leave Event'}
        </button>

        {/* Cancel Button */}
        <button
          onClick={onCancel}
          className='border border-gray-500 text-white w-[60%] py-2 rounded-full text-sm font-medium'
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default EndEventPrompt;
