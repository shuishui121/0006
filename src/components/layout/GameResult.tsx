import { useEffect, useState } from 'react';
import { Trophy, Clock, Coins, Star, Home, RotateCcw } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { useNavigate } from 'react-router-dom';
import { TIME_BONUS_THRESHOLDS } from '@/utils/constants';

export function GameResult() {
  const { elapsedTime, tokens, clues, addTokens, resetGame } = useGameStore();
  const navigate = useNavigate();
  const [showDetails, setShowDetails] = useState(false);
  const [bonusTokens, setBonusTokens] = useState(0);

  useEffect(() => {
    let bonus = 0;
    for (const threshold of TIME_BONUS_THRESHOLDS) {
      if (elapsedTime <= threshold.time) {
        bonus = threshold.bonus;
        break;
      }
    }
    setBonusTokens(bonus);
    addTokens(bonus);
  }, [elapsedTime, addTokens]);

  useEffect(() => {
    const timer = setTimeout(() => setShowDetails(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  };

  const getRank = (): { rank: string; stars: number; color: string } => {
    if (elapsedTime <= 60) return { rank: '墨家大师', stars: 5, color: 'text-yellow-400' };
    if (elapsedTime <= 120) return { rank: '机关高手', stars: 4, color: 'text-purple-400' };
    if (elapsedTime <= 180) return { rank: '墨家弟子', stars: 3, color: 'text-blue-400' };
    if (elapsedTime <= 300) return { rank: '入门学徒', stars: 2, color: 'text-green-400' };
    return { rank: '初出茅庐', stars: 1, color: 'text-gray-400' };
  };

  const rankInfo = getRank();

  const handleRestart = () => {
    resetGame();
    navigate('/game');
  };

  const handleHome = () => {
    resetGame();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#1a1410] flex flex-col items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute inset-0">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          >
            <Star size={20 + Math.random() * 20} className="text-[#e8c07d] opacity-20" />
          </div>
        ))}
      </div>

      <div className={`relative z-10 text-center max-w-2xl mx-auto transition-all duration-1000 ${showDetails ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="mb-6">
          <Trophy size={80} className="text-[#e8c07d] mx-auto mb-4" />
          <h1 className="text-5xl text-[#e8c07d] font-bold mb-2">恭喜通关！</h1>
          <p className="text-[#d4c4a8] text-xl">你已破解墨家密室的所有机关</p>
        </div>

        <div className="bg-[#2a1f18] border-4 border-[#cd7f32] rounded-xl p-8 mb-8">
          <div className={`text-3xl font-bold mb-6 ${rankInfo.color}`}>
            {rankInfo.rank}
            <div className="flex justify-center gap-1 mt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={28}
                  className={i < rankInfo.stars ? 'text-yellow-400 fill-yellow-400' : 'text-[#444]'}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-[#1a1410] p-4 rounded-lg border border-[#555]">
              <Clock size={28} className="text-[#e8c07d] mx-auto mb-2" />
              <div className="text-2xl text-[#d4c4a8] font-bold">{formatTime(elapsedTime)}</div>
              <div className="text-sm text-[#8b7355]">通关时间</div>
            </div>

            <div className="bg-[#1a1410] p-4 rounded-lg border border-[#555]">
              <Coins size={28} className="text-[#e8c07d] mx-auto mb-2" />
              <div className="text-2xl text-[#d4c4a8] font-bold">{tokens - bonusTokens}</div>
              <div className="text-sm text-[#8b7355]">剩余令牌</div>
            </div>

            <div className="bg-[#2d4a3e] p-4 rounded-lg border border-[#4a7c59]">
              <Star size={28} className="text-[#e8c07d] mx-auto mb-2" />
              <div className="text-2xl text-[#d4c4a8] font-bold">+{bonusTokens}</div>
              <div className="text-sm text-[#8b7355]">奖励令牌</div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg text-[#cd7f32] mb-3">收集的线索：</h3>
            <div className="flex justify-center gap-4">
              {clues.map((clue, i) => (
                <div
                  key={i}
                  className="w-16 h-16 bg-[#2d4a3e] border-2 border-[#8b7355] rounded-lg flex items-center justify-center text-2xl text-[#e8c07d] font-bold"
                >
                  {clue}
                </div>
              ))}
            </div>
            <p className="text-[#d4c4a8] mt-3">
              最终密码：<span className="text-[#e8c07d] font-bold text-xl">{clues.join('')}</span>
            </p>
          </div>

          <div className="p-4 bg-[#1a1410] rounded-lg border border-[#555]">
            <p className="text-[#d4c4a8] italic">
              "恭喜你，年轻的墨家弟子。你已通过考验，获得了先祖的机关绝学。
              愿你将这份智慧用于正道，守护天下苍生。"
            </p>
            <p className="text-[#8b7355] text-right mt-2">—— 墨子遗言</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={handleRestart}
            className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#8b6914] to-[#cd7f32] border-2 border-[#e8c07d] rounded-xl text-white text-lg font-bold hover:from-[#a07a1a] hover:to-[#e8c07d] transition-all"
          >
            <RotateCcw size={22} />
            <span>再玩一次</span>
          </button>

          <button
            onClick={handleHome}
            className="flex items-center gap-2 px-8 py-3 bg-[#2a1f18] border-2 border-[#8b7355] rounded-xl text-[#d4c4a8] text-lg hover:bg-[#3d2f22] hover:border-[#e8c07d] transition-all"
          >
            <Home size={22} />
            <span>返回主菜单</span>
          </button>
        </div>
      </div>
    </div>
  );
}
