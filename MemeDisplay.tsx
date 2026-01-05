
import React from 'react';
import { Meme } from './types';

interface MemeDisplayProps {
  meme: Meme;
  onDownload: (url: string) => void;
}

const MemeDisplay: React.FC<MemeDisplayProps> = ({ meme, onDownload }) => {
  return (
    <div className="bg-white border-4 border-[#8B4513] rounded-lg shadow-2xl overflow-hidden max-w-sm mx-auto transform transition-all hover:scale-[1.02]">
      <div className="relative aspect-square">
        <img src={meme.url} alt="Generated One Piece Meme" className="w-full h-full object-cover" />
      </div>
      <div className="p-4 bg-[#F5DEB3] border-t-4 border-[#8B4513]">
        <p className="text-[#5D2E0A] font-medium mb-4 text-center italic">"{meme.caption}"</p>
        <button 
          onClick={() => onDownload(meme.url)}
          className="w-full py-2 bg-[#E63946] hover:bg-[#D62828] text-white font-bold rounded-full shadow-lg transition-colors flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-download"></i>
          Collect Treasure (Download)
        </button>
      </div>
    </div>
  );
};

export default MemeDisplay;
