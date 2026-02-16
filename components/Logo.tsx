
import React, { useState } from 'react';

interface LogoProps {
  url?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  companyName?: string;
}

const Logo: React.FC<LogoProps> = ({ url, className = '', size = 'md', companyName = 'GoldMind Tuition' }) => {
  const [hasFailed, setHasFailed] = useState(false);

  // Height-based size mapping
  const heightMap = {
    sm: 'h-8 text-lg',
    md: 'h-9 md:h-12 text-2xl',
    lg: 'h-16 md:h-20 text-3xl'
  };

  const placeholderSize = {
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-9 h-9 md:w-12 md:h-12 text-sm',
    lg: 'w-16 h-16 md:w-20 md:h-20 text-xl'
  };

  if (url && url.trim() !== '' && !hasFailed) {
    return (
      <div className={`${heightMap[size].split(' ')[0]} flex items-center shrink-0`}>
        <img 
          src={url} 
          alt={companyName} 
          className={`h-full w-auto object-contain block ${className}`}
          onError={() => setHasFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`${placeholderSize[size]} bg-brand-grey rounded-2xl flex items-center justify-center font-black text-gold shadow-xl shadow-gold/5 transition-transform hover:scale-105 shrink-0 ${className}`}>
        GM
      </div>
      {size === 'lg' && (
        <p className="text-xs font-black text-brand-grey uppercase tracking-widest">{companyName}</p>
      )}
    </div>
  );
};

export default Logo;
