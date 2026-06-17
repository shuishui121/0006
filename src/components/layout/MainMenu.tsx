import { BookOpen, Play, Info } from 'lucide-react';
import { useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { useNavigate } from 'react-router-dom';

export function MainMenu() {
  const [showInstructions, setShowInstructions] = useState(false);
  const { startGame } = useGameStore();
  const navigate = useNavigate();

  const handleStart = () => {
    startGame();
    navigate('/game');
  };

  return (
    <div className="min-h-screen bg-[#1a1410] flex flex-col items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 text-9xl text-[#e8c07d]">墨</div>
        <div className="absolute bottom-10 right-10 text-9xl text-[#e8c07d]">機</div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[40rem] text-[#e8c07d] opacity-5">關</div>
      </div>

      <div className="relative z-10 text-center max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="text-[#8b7355] text-xl mb-2 tracking-widest">MOJIIA MISHI</div>
          <h1 className="text-6xl md:text-7xl text-[#e8c07d] mb-4 font-bold tracking-wider">
            墨家密室
          </h1>
          <div className="w-32 h-1 bg-gradient-to-r from-transparent via-[#cd7f32] to-transparent mx-auto mb-4" />
          <p className="text-[#d4c4a8] text-xl">
            破解千古机关，探寻墨子绝学
          </p>
        </div>

        <div className="mb-12 p-6 bg-[#2a1f18]/80 border-2 border-[#8b7355] rounded-xl backdrop-blur">
          <p className="text-[#d4c4a8] text-lg leading-relaxed">
            相传墨家总院的后山有一座密室，里面藏着墨子亲手绘制的机关图谱。
            你作为墨家新进弟子，为了寻找失传的机关绝学，闯入了这座尘封千年的密室...
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={handleStart}
            className="group flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-[#8b6914] to-[#cd7f32] border-2 border-[#e8c07d] rounded-xl text-white text-xl font-bold hover:from-[#a07a1a] hover:to-[#e8c07d] transition-all transform hover:scale-105 shadow-lg hover:shadow-[#cd7f32]/30"
          >
            <Play size={28} />
            <span>开始探险</span>
          </button>

          <button
            onClick={() => setShowInstructions(true)}
            className="flex items-center gap-3 px-8 py-4 bg-[#2a1f18] border-2 border-[#8b7355] rounded-xl text-[#d4c4a8] text-xl hover:bg-[#3d2f22] hover:border-[#e8c07d] transition-all"
          >
            <BookOpen size={24} />
            <span>游戏说明</span>
          </button>
        </div>

        <div className="mt-12 flex items-center justify-center gap-8 text-[#8b7355]">
          <div className="flex items-center gap-2">
            <Info size={18} />
            <span>5个机关房间</span>
          </div>
          <div className="w-px h-6 bg-[#555]" />
          <div className="flex items-center gap-2">
            <Info size={18} />
            <span>3枚初始令牌</span>
          </div>
          <div className="w-px h-6 bg-[#555]" />
          <div className="flex items-center gap-2">
            <Info size={18} />
            <span>通关有奖</span>
          </div>
        </div>
      </div>

      {showInstructions && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#2a1f18] border-4 border-[#cd7f32] rounded-xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-3xl text-[#e8c07d] font-bold mb-6 text-center">游戏说明</h2>

            <div className="space-y-6 text-[#d4c4a8]">
              <div>
                <h3 className="text-xl text-[#cd7f32] mb-2">🎯 游戏目标</h3>
                <p>破解五个房间的机关谜题，找到最终的机关图谱。</p>
              </div>

              <div>
                <h3 className="text-xl text-[#cd7f32] mb-2">🖱️ 操作方式</h3>
                <p>使用鼠标点击进行交互，点击机关部件时会有高亮提示。</p>
              </div>

              <div>
                <h3 className="text-xl text-[#cd7f32] mb-2">🏛️ 五个房间</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>齿轮室</strong>：调整齿轮的位置和大小让动力传到出口</li>
                  <li><strong>符文室</strong>：按照正确的顺序点亮十二个符文</li>
                  <li><strong>镜像室</strong>：利用镜子反射激光击中目标</li>
                  <li><strong>权衡室</strong>：放置不同重量的石块让天平保持水平</li>
                  <li><strong>玄机室</strong>：根据前四关的线索推出正确密码</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl text-[#cd7f32] mb-2">🎫 墨家令牌</h3>
                <p>初始有3枚令牌，实在卡关可以花1枚令牌查看提示。通关时间越短，奖励的令牌越多！</p>
              </div>

              <div>
                <h3 className="text-xl text-[#cd7f32] mb-2">⚠️ 注意事项</h3>
                <p>操作错误不会死亡，但会触发小惩罚——房间变暗3秒钟。每关完成后会获得一条线索，用于破解最终的密码锁。</p>
              </div>
            </div>

            <button
              onClick={() => setShowInstructions(false)}
              className="w-full mt-8 py-3 bg-[#8b7355] border-2 border-[#cd7f32] rounded-lg text-[#d4c4a8] text-lg hover:bg-[#a08060] hover:border-[#e8c07d] transition-all"
            >
              我知道了
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
