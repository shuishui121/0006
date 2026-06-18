import { generateAllPuzzles } from './src/puzzle/puzzleGenerator';
import type { DifficultyLevel } from './src/utils/prng';
import { DIFFICULTY_CONFIGS } from './src/utils/prng';

const TEST_COUNT = 1000;
const difficulties: DifficultyLevel[] = ['easy', 'normal', 'hard'];

console.log('='.repeat(70));
console.log('墨家密室 - 谜题随机生成系统完整验收测试');
console.log(`每难度各 ${TEST_COUNT} 道题`);
console.log('='.repeat(70));
console.log();

let allPassed = true;

for (const diff of difficulties) {
  console.log(`========== ${DIFFICULTY_CONFIGS[diff].label} 难度 ==========`);
  
  let solvable = 0;
  let totalTime = 0;
  const roomTimes: Record<string, number> = { gear: 0, rune: 0, mirror: 0, balance: 0, lock: 0 };
  let maxTime = 0;
  const failedSeeds: string[] = [];
  const stateSpaceSizes: number[] = [];
  
  for (let i = 0; i < TEST_COUNT; i++) {
    const seed = `FULL_TEST_${diff}_${i.toString().padStart(6, '0')}`;
    
    try {
      const result = generateAllPuzzles(seed, diff);
      solvable++;
      totalTime += result.totalGenerationTime;
      if (result.totalGenerationTime > maxTime) {
        maxTime = result.totalGenerationTime;
      }
      for (const [room, time] of Object.entries(result.roomTimes)) {
        roomTimes[room] += time;
      }
      
      const totalStateSpace = result.puzzles.slice(0, 4).reduce((sum, p) => sum + p.stateSpaceSize, 0);
      stateSpaceSizes.push(totalStateSpace);
    } catch (e) {
      failedSeeds.push(seed);
    }
  }
  
  const successRate = (solvable / TEST_COUNT) * 100;
  const avgTime = totalTime / solvable;
  
  console.log(`可解率: ${solvable}/${TEST_COUNT} = ${successRate.toFixed(2)}%`);
  console.log(`平均生成时间: ${avgTime.toFixed(2)}ms`);
  console.log(`最长生成时间: ${maxTime.toFixed(2)}ms`);
  
  console.log('各房间平均耗时:');
  for (const [room, time] of Object.entries(roomTimes)) {
    console.log(`  ${room}: ${(time / solvable).toFixed(2)}ms`);
  }
  
  if (stateSpaceSizes.length > 0) {
    const avgSS = stateSpaceSizes.reduce((a, b) => a + b, 0) / stateSpaceSizes.length;
    console.log(`平均总状态空间: ${Math.round(avgSS)}`);
  }
  
  if (failedSeeds.length > 0) {
    console.log(`失败种子数量: ${failedSeeds.length}`);
    console.log(`前5个失败种子: ${failedSeeds.slice(0, 5).join(', ')}`);
    allPassed = false;
  }
  
  if (successRate < 99.9) {
    console.log('❌ 可解率低于99.9%，未通过验收');
    allPassed = false;
  } else {
    console.log('✅ 可解率达标');
  }
  
  if (avgTime > 500) {
    console.log('❌ 平均生成时间超过500ms，未通过验收');
    allPassed = false;
  } else {
    console.log('✅ 生成速度达标');
  }
  
  console.log('');
}

console.log('========== 种子一致性测试 ==========');
const testSeed = 'CONSISTENCY_CHECK';
let seedConsistent = true;

const firstResult = generateAllPuzzles(testSeed, 'normal');
const firstJson = JSON.stringify(firstResult.puzzles);

for (let i = 0; i < 100; i++) {
  const result = generateAllPuzzles(testSeed, 'normal');
  if (JSON.stringify(result.puzzles) !== firstJson) {
    seedConsistent = false;
    console.log(`❌ 第 ${i + 1} 次生成与第一次不一致`);
    break;
  }
}

if (seedConsistent) {
  console.log('✅ 同一种子100次生成完全一致');
} else {
  allPassed = false;
}

console.log();
console.log('='.repeat(70));
console.log('📋 验收总结');
console.log('='.repeat(70));

if (allPassed) {
  console.log('🎉 恭喜！所有验收测试通过！');
  console.log(`- 三种难度各${TEST_COUNT}道题全部可解`);
  console.log('- 同一种子100次生成完全一致');
  console.log('- 平均生成时间 < 500ms');
} else {
  console.log('⚠️ 部分验收测试未通过，请检查上方详情。');
}
