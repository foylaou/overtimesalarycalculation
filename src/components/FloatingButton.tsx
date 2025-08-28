import React, {useState} from "react";
import {MessageCircleMore} from "lucide-react";


interface FloatingChatButtonProps {
  onClick: () => void;
  unreadCount: number;
  className?: string;
  icon?: React.ReactNode;
  accessKey?: string;
}


const FloatingButton: React.FC<FloatingChatButtonProps> = ({
                                                                   onClick,
                                                                   unreadCount,
                                                                   className,
                                                                   icon,
                                                                   accessKey
                                                               }) => {
  const [isHovered, setIsHovered] = useState(false);



  return (
    <div className={className?(className):`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 md:bottom-9 md:right-9 z-50`}>
      <div className="relative">
        <button
          accessKey={accessKey?(accessKey):'h'}
          onClick={onClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`btn btn-circle btn-primary shadow-2xl transition-all duration-300 
            w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 min-h-0 ${
            isHovered 
              ? 'shadow-xl scale-110' 
              : 'hover:shadow-xl hover:scale-105'
          }`}
          style={{
            animation: 'bounceIn 0.5s ease-out'
          }}
        >
            {icon?(icon):(
                            <MessageCircleMore className={`h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 transition-transform duration-200 ${isHovered ? 'scale-110' : ''}`} />
            )}


        </button>

        {/* 未讀訊息徽章 */}
        {unreadCount > 0 && (
          <div
            className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 badge badge-sm badge-error font-bold rounded-full h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center"
            style={{
              animation: 'pulse 2s infinite, bounceIn 0.5s ease-out'
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </div>
    </div>
  );
};

export default FloatingButton;
