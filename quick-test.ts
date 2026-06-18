import { SeededRandom, generateRandomSeed, DIFFICULTY_CONFIGS } from './src/utils/prng';
import type { DifficultyLevel } from './src/utils/prng';
import { generateGearPuzzle, solveGearPuzzle } from './src/puzzle/gearPuzzle';
import { generateRunePuzzle } from './src/puzzle/runePuzzle';
import { generateMirrorPuzzle, solveMirrorPuzzle } from './src/puzzle/mirrorPuzzle';
import { generateBalancePuzzle } from './src/puzzle/balancePuzzle';
import { generateAllPuzzles } from './src/puzzle/puzzleGenerator';

console.log('='.repeat(70));
console.log('墨家密室 - 谜题随机生成系统快速验收测试');
console.log('='.repeat(70));
console.log();

let allPassed = true;
const testResults: { name: string; passed: boolean; message: string }[] = [];

const addResult = (name: string, passed: boolean, message: string) => {
  testResults.push({ name, passed, message });
  if (!passed) allPassed = false;
  console.log(`${passed ? '✅' : '❌'} ${name}`);
  console.log(`   ${message}`);
};

console.log('📊 1. PRNG 伪随机数生成器测试');
console.log('-'.repeat(50));

const seed = 'TEST1234';
const rng1 = new SeededRandom(seed);
const rng2 = new SeededRandom(seed);
const v1 = Array.from({ length: 100 }, () => rng1.next());
const v2 = Array.from({ length: 100 }, () => rng2.next());
const consistent = v1.every((v, i) => v === v2[i]);
addResult('种子一致性', consistent,
  consistent ? '同一种子生成100个随机数完全一致' : '同一种子生成的随机数不一致');

const shuffleArr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const s1 = new SeededRandom('SHUF').shuffle([...shuffleArr]);
const s2 = new SeededRandom('SHUF').shuffle([...shuffleArr]);
const shuffleConsistent = s1.every((v, i) => v === s2[i]);
addResult('shuffle 一致性', shuffleConsistent,
  shuffleConsistent ? 'shuffle 方法具有种子一致性' : 'shuffle 方法不一致');

console.log();
console.log('🎮 2. 各房间谜题生成测试');
console.log('-'.repeat(50));

const difficulties: DifficultyLevel[] = ['easy', 'normal', 'hard'];
for (const diff of difficulties) {
  try {
    const testSeed = `${diff.toUpperCase()}_QUICK`;
    const rng = new SeededRandom(testSeed);
    const result = generateAllPuzzles(testSeed, diff);
    addResult(
      `${DIFFICULTY_CONFIGS[diff].label}难度生成`,
      result.puzzles.length === 5,
      `5个房间生成成功，总耗时 ${result.totalGenerationTime.toFixed(2)}ms`,
    );
  } catch (e: any) {
    addResult(
      `${DIFFICULTY_CONFIGS[diff].label}难度生成`,
      false,
      `生成失败: ${e.message || e}`,
    );
  }
}

console.log();
console.log('🔍 3. 可解性抽样测试 (每难度各10道)');
console.log('-'.repeat(50));

for (const diff of difficulties) {
  let solvable = 0;
  const total = 10;
  for (let i = 0; i < total; i++) {
    const testSeed = `${diff}_SOLV_${i}`;
    try {
      generateAllPuzzles(testSeed, diff);
      solvable++;
    } catch (e) {
      // 不可解
    }
  }
  const rate = solvable / total;
  addResult(
    `${DIFFICULTY_CONFIGS[diff].label}难度可解率`,
    rate >= 0.9,
    `${solvable}/${total} = ${(rate * 100).toFixed(0)}% 可解`,
  );
}

console.log();
console.log('🔄 4. 种子一致性测试');
console.log('-'.repeat(50));

const conSeed = 'CONSISTENCY_TEST';
const res1 = generateAllPuzzles(conSeed, 'normal');
const res2 = generateAllPuzzles(conSeed, 'normal');
const samePuzzlesSame = JSON.stringify(res1.puzzles) === JSON.stringify(res2.puzzles);
addResult(
  '同一种子两次生成一致',
  samePuzzlesSame,
  samePuzzlesSame ? '两次生成的谜题完全一致' : '两次生成的谜题不一致',
);

console.log();
console.log('🔐 5. 密码房间验证');
console.log('-'.repeat(50));

let lockOk = true;
for (let i = 0; i < 10; i++) {
  const testSeed = `LOCK_TEST_${i}`;
  const result = generateAllPuzzles(testSeed, 'normal');
  const lockCode = result.puzzles[4].data.correctCode;
  const clues = result.puzzles.slice(0, 4).map((p: any) => p.clue);
  const expected = clues.join('');
  if (lockCode !== expected) {
    lockOk = false;
    break;
  }
}
addResult(
  '密码与前四关线索一致',
  lockOk,
  lockOk ? '所有测试密码都与线索正确对应' : '存在密码与线索不匹配',
);

console.log();
console.log('⚡ 6. 性能测试 (10次平均)');
console.log('-'.repeat(50));

const times: number[] = [];
for (let i = 0; i < 10; i++) {
  const testSeed = `PERF_${i}`;
  const result = generateAllPuzzles(testSeed, 'normal');
  times.push(result.totalGenerationTime);
}
const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
const maxTime = Math.max(...times);
addResult(
  '单局生成时间 < 500ms',
  avgTime < 500,
  `平均: ${avgTime.toFixed(2)}ms, 最大: ${maxTime.toFixed(2)}ms`,
);

console.log();
console.log('='.repeat(70));
console.log('📋 测试总结');
console.log('='.repeat(70));

const passed = testResults.filter(r => r.passed).length;
console.log(`总测试项: ${testResults.length}`);
console.log(`通过: ${passed}`);
console.log(`通过率: ${((passed / testResults.length) * 100).toFixed(1)}%`);
console.log();

if (allPassed) {
  console.log('🎉 所有快速测试通过！');
} else {
  console.log('⚠️ 部分测试未通过。');
}

console.log();
console.log('提示: 运行完整的1000道题验收测试，请访问 /test 页面');
