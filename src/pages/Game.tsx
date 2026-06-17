import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameCanvas } from '@/components/game/GameCanvas';
import { HUD } from '@/components/ui/HUD';
import { useGameStore } from '@/store/useGameStore';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/utils/constants';
import { ChevronRight, X } from 'lucide-react';

export default function Game() {
  const navigate = useNavigate();
  const { currentRoom, completedRooms, transitioning, clues, resetGame, setTransitioning, setCurrentRoom } = useGameStore();
  const [showMenuConfirm, setShowMenuConfirm] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
  const [showClueModal, setShowClueModal] = useState(false);
  const [newClue, setNewClue] = useState<string | null>(null);
  const [prevCompletedCount, setPrevCompletedCount] = useState(0);

  const completedCount = completedRooms.filter(Boolean).length;

  useEffect(() => {
    if (completedCount > prevCompletedCount && completedCount <= 4) {
      const clue = clues[completedCount - 1];
      if (clue) {
        setNewClue(clue);
        setShowClueModal(true);
      }
    }
    setPrevCompletedCount(completedCount);
  }, [completedCount, clues, prevCompletedCount]);

  useEffect(() => {
    if (completedRooms[4]) {
      const timer = setTimeout(() => {
        navigate('/result');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [completedRooms, navigate]);

  useEffect(() => {
    const updateSize = () => {
      const maxWidth = Math.min(window.innerWidth - 32, CANVAS_WIDTH);
      const maxHeight = Math.min(window.innerHeight - 180, CANVAS_HEIGHT);
      const scale = Math.min(maxWidth / CANVAS_WIDTH, maxHeight / CANVAS_HEIGHT);
      setCanvasSize({
        width: CANVAS_WIDTH * scale,
        height: CANVAS_HEIGHT * scale,
      });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleMenu = useCallback(() => {
    setShowMenuConfirm(true);
  }, []);

  const handleConfirmMenu = () => {
    resetGame();
    navigate('/');
  };

  const handleCloseClueModal = () => {
    setShowClueModal(false);
    setNewClue(null);
  };

  const handleNextRoom = () => {
    if (currentRoom < 4) {
      setTransitioning(true);
      setTimeout(() => {
        setCurrentRoom(currentRoom + 1);
        setTransitioning(false);
      }, 800);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1410] flex flex-col items-center py-4 px-4">
      <HUD onMenu={handleMenu} />

      <div className="flex-1 flex items-center justify-center w-full mt-24">
        <div
          className="relative rounded-xl overflow-hidden shadow-2xl border-4 border-[#8b7355]"
          style={{
            width: canvasSize.width,
            height: canvasSize.height,
          }}
        >
          <GameCanvas width={canvasSize.width} height={canvasSize.height} />

          {transitioning && (
            <div className="absolute inset-0 bg-black/80 z-20 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl text-[#e8c07d] mb-4">🔓</div>
                <div className="text-3xl text-[#d4c4a8] mb-2">机关已破解！</div>
                {completedRooms[currentRoom] && currentRoom < 4 && (
                  <button
                    onClick={handleNextRoom}
                    className="flex items-center gap-2 px-6 py-3 bg-[#cd7f32] border-2 border-[#e8c07d] rounded-lg text-white text-lg hover:bg-[#e8c07d] transition-all mx-auto mt-4"
                  >
                    <span>进入下一房间</span>
                    <ChevronRight size={24} />
                  </button>
                )}
                {completedRooms[4] && (
                  <div className="text-2xl text-[#4a7c59] mt-4">正在打开机关图谱...</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showMenuConfirm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#2a1f18] border-4 border-[#cd7f32] rounded-xl p-8 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl text-[#e8c07d] font-bold">确认返回</h3>
              <button
                onClick={() => setShowMenuConfirm(false)}
                className="text-[#8b7355] hover:text-[#d4c4a8] transition-colors"
              >
                <X size={28} />
              </button>
            </div>
            <p className="text-[#d4c4a8] text-lg mb-6">
              返回主菜单将重置当前游戏进度，确定要返回吗？
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowMenuConfirm(false)}
                className="flex-1 py-3 bg-[#2a1f18] border-2 border-[#8b7355] rounded-lg text-[#d4c4a8] text-lg hover:bg-[#3d2f22] transition-all"
              >
                继续游戏
              </button>
              <button
                onClick={handleConfirmMenu}
                className="flex-1 py-3 bg-[#8b3a3a] border-2 border-[#a04040] rounded-lg text-white text-lg hover:bg-[#a04040] transition-all"
              >
                确认返回
              </button>
            </div>
          </div>
        </div>
      )}

      {showClueModal && newClue && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#2a1f18] border-4 border-[#cd7f32] rounded-xl p-8 max-w-md w-full text-center">
            <div className="text-6xl mb-4">🔮</div>
            <h3 className="text-2xl text-[#e8c07d] font-bold mb-4">获得线索！</h3>
            <div className="bg-[#2d4a3e] border-2 border-[#8b7355] rounded-lg p-6 mb-6">
              <div className="text-5xl text-[#e8c07d] font-bold">{newClue}</div>
              <p className="text-[#d4c4a8] mt-2">这是破解最终密码锁的线索之一</p>
            </div>
            <button
              onClick={handleCloseClueModal}
              className="w-full py-3 bg-[#8b7355] border-2 border-[#cd7f32] rounded-lg text-[#d4c4a8] text-lg hover:bg-[#a08060] hover:border-[#e8c07d] transition-all"
            >
              我记住了
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
