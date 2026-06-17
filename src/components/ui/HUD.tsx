import { useEffect } from 'react';
import { Clock, Coins, HelpCircle, Home } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { ROOM_NAMES } from '@/types/game';
import { ROOM_ORDER } from '@/utils/constants';
import { getHint, getMaxHints } from '@/data/hints';

interface HUDProps {
  onMenu: () => void;
}

export function HUD({ onMenu }: HUDProps) {
  const {
    currentRoom,
    tokens,
    elapsedTime,
    startTime,
    hintLevels,
    isDarkened,
    darkenedTime,
    showHint,
    currentHint,
    completedRooms,
    updateElapsedTime,
    updateDarkenTime,
    consumeToken,
    showHintModal,
    hideHintModal,
    incrementHintLevel,
  } = useGameStore();

  useEffect(() => {
    if (!startTime) return;

    const timer = setInterval(() => {
      updateElapsedTime();
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime, updateElapsedTime]);

  useEffect(() => {
    if (!isDarkened) return;

    const timer = setInterval(() => {
      updateDarkenTime(1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isDarkened, updateDarkenTime]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleShowHint = () => {
    if (tokens <= 0) return;

    const roomType = ROOM_ORDER[currentRoom];
    const currentHintLevel = hintLevels[currentRoom];
    const maxHints = getMaxHints(roomType);

    if (currentHintLevel >= maxHints) {
      showHintModal('没有更多提示了，相信自己！');
      return;
    }

    const hint = getHint(roomType, currentHintLevel);
    if (hint && consumeToken()) {
      incrementHintLevel(currentRoom);
      showHintModal(hint);
    }
  };

  const roomType = ROOM_ORDER[currentRoom];
  const roomName = ROOM_NAMES[roomType];

  return (
    <div className="absolute top-0 left-0 right-0 z-10 p-4">
      <div className="flex items-center justify-between max-w-5xl mx-auto">
        <div className="flex items-center gap-6">
          <button
            onClick={onMenu}
            className="flex items-center gap-2 px-4 py-2 bg-[#2a1f18] border-2 border-[#8b7355] rounded-lg text-[#d4c4a8] hover:bg-[#3d2f22] hover:border-[#e8c07d] transition-all"
          >
            <Home size={18} />
            <span>主菜单</span>
          </button>

          <div className="px-5 py-2 bg-[#2a1f18] border-2 border-[#cd7f32] rounded-lg">
            <span className="text-[#e8c07d] text-lg font-bold">{roomName}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-[#2a1f18] border-2 border-[#8b7355] rounded-lg">
            <Clock size={20} className="text-[#e8c07d]" />
            <span className="text-[#d4c4a8] font-mono text-lg">{formatTime(elapsedTime)}</span>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-[#2a1f18] border-2 border-[#cd7f32] rounded-lg">
            <Coins size={20} className="text-[#e8c07d]" />
            <span className="text-[#d4c4a8] font-bold text-lg">×{tokens}</span>
          </div>

          <button
            onClick={handleShowHint}
            disabled={tokens <= 0}
            className={`flex items-center gap-2 px-4 py-2 border-2 rounded-lg transition-all ${
              tokens > 0
                ? 'bg-[#2d4a3e] border-[#4a7c59] text-[#d4c4a8] hover:bg-[#3d5a4e] hover:border-[#6ba37c]'
                : 'bg-[#333] border-[#555] text-[#666] cursor-not-allowed'
            }`}
          >
            <HelpCircle size={20} />
            <span>提示 (1令牌)</span>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 mt-4">
        {ROOM_ORDER.map((_, idx) => (
          <div
            key={idx}
            className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
              completedRooms[idx]
                ? 'bg-[#4a7c59] border-[#6ba37c] text-white'
                : idx === currentRoom
                ? 'bg-[#cd7f32] border-[#e8c07d] text-white animate-pulse'
                : 'bg-[#2a1f18] border-[#555] text-[#666]'
            }`}
          >
            {idx + 1}
          </div>
        ))}
      </div>

      {isDarkened && (
        <div className="fixed inset-0 bg-black opacity-90 z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl text-[#8b3a3a] mb-4">⚠</div>
            <div className="text-3xl text-[#d4c4a8] mb-2">机关触发了陷阱！</div>
            <div className="text-xl text-[#8b7355]">房间将在 {darkenedTime} 秒后恢复...</div>
          </div>
        </div>
      )}

      {showHint && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#2a1f18] border-4 border-[#cd7f32] rounded-xl p-8 max-w-lg w-full">
            <div className="flex items-center gap-3 mb-4">
              <HelpCircle size={32} className="text-[#e8c07d]" />
              <h3 className="text-2xl text-[#e8c07d] font-bold">墨家提示</h3>
            </div>
            <p className="text-[#d4c4a8] text-lg leading-relaxed mb-6">{currentHint}</p>
            <button
              onClick={hideHintModal}
              className="w-full py-3 bg-[#8b7355] border-2 border-[#cd7f32] rounded-lg text-[#d4c4a8] text-lg hover:bg-[#a08060] hover:border-[#e8c07d] transition-all"
            >
              明白了
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
