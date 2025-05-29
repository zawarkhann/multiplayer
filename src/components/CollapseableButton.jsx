import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

const CollapsibleButton = ({ isExpanded, onClick }) => {
  return (
    <button
      onClick={onClick}
      className='absolute right-0 bg-black/70 hover:bg-black/80 transition-all duration-300 h-12 w-8 rounded-l-md flex items-center justify-center'
      style={{ top: '50%', transform: 'translateY(-50%)' }}
    >
      {isExpanded ? <ArrowRight size={16} color='white' /> : <ArrowLeft size={16} color='white' />}
    </button>
  );
};

export default CollapsibleButton;
