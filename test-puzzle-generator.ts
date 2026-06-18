import { generateAllPuzzles, runAcceptanceTest } from './src/puzzle/puzzleGenerator';
import { SeededRandom, generateRandomSeed, DIFFICULTY_CONFIGS } from './src/utils/prng';
import type { DifficultyLevel } from './src/utils/prng';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

const runPRNGTests = (): TestResult[] => {
  const results: TestResult[] = [];

  results.push({
    name: 'PRNG 种子一致性',
    passed: false,
    message: '',
  });

  const seed = 'TEST1234';
  const rng1 = new SeededRandom(seed);
  const rng2 = new SeededRandom(seed);

  const values1 = Array.from({ length: 100 }, () => rng1.next());
  const values2 = Array.from({ length: 100 }, () => rng2.next());

  const consistent = values1.every((v, i) => v === values2[i]);
  results[0].passed = consistent;
  results[0].message = consistent
    ? '同一种子生成100个随机数完全一致'
    : '同一种子生成的随机数不一致';

  results.push({
    name: 'PRNG 字符串种子',
    passed: false,
    message: '',
  });

  const strRng1 = new SeededRandom('HELLO');
  const strRng2 = new SeededRandom('HELLO');
  const strConsistent = strRng1.next() === strRng2.next();
  results[1].passed = strConsistent;
  results[1].message = strConsistent
    ? '字符串种子可以正确生成随机数'
    : '字符串种子生成失败';

  results.push({
    name: 'PRNG 不同种子',
    passed: false,
    message: '',
  });

  const diffRng1 = new SeededRandom('SEED1');
  const diffRng2 = new SeededRandom('SEED2');
  const diffValues1 = Array.from({ length: 10 }, () => diffRng1.next());
  const diffValues2 = Array.from({ length: 10 }, () => diffRng2.next());
  const different = diffValues1.some((v, i) => v !== diffValues2[i]);
  results[2].passed = different;
  results[2].message = different
    ? '不同种子生成不同的随机序列'
    : '不同种子生成了相同的序列（可能是巧合）';

  results.push({
    name: 'PRNG shuffle 方法',
    passed: false,
    message: '',
  });

  const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const shuffled1 = new SeededRandom('SHUFFLE').shuffle([...arr]);
  const shuffled2 = new SeededRandom('SHUFFLE').shuffle([...arr]);
  const shuffledConsistent = shuffled1.every((v, i) => v === shuffled2[i]);
  results[3].passed = shuffledConsistent;
  results[3].message = shuffledConsistent
    ? 'shuffle 方法具有种子一致性'
    : 'shuffle 方法不具有种子一致性';

  results.push({
    name: 'PRNG nextInt 范围',
    passed: false,
    message: '',
  });

  const intRng = new SeededRandom('INTTEST');
  const intValues = Array.from({ length: 1000 }, () => intRng.nextInt(1, 10));
  const allInRange = intValues.every((v) => v >= 1 && v <= 10 && Number.isInteger(v));
  results[4].passed = allInRange;
  results[4].message = allInRange
    ? 'nextInt 生成的值都在指定范围内'
    : 'nextInt 生成的值超出了指定范围';

  return results;
};

const runGenerationTests = (): TestResult[] => {
  const results: TestResult[] = [];

  const difficulties: DifficultyLevel[] = ['easy', 'normal', 'hard'];

  for (const difficulty of difficulties) {
    results.push({
      name: `${DIFFICULTY_CONFIGS[difficulty].label}难度 - 谜题生成`,
      passed: false,
      message: '',
    });

    try {
      const seed = `${difficulty.toUpperCase()}_TEST`;
      const result = generateAllPuzzles(seed, difficulty);
      const lastIdx = results.length - 1;
      results[lastIdx].passed = result.puzzles.length === 5;
      results[lastIdx].message = `成功生成5个房间的谜题，总耗时 ${result.totalGenerationTime.toFixed(2)}ms`;
      results[lastIdx].details = {
        totalTime: result.totalGenerationTime,
        roomTimes: result.roomTimes,
      };
    } catch (e) {
      const lastIdx = results.length - 1;
      results[lastIdx].passed = false;
      results[lastIdx].message = `生成失败: ${e}`;
    }
  }

  results.push({
    name: '单局生成时间 < 500ms',
    passed: false,
    message: '',
  });

  const timeResults: number[] = [];
  for (let i = 0; i < 10; i++) {
    const seed = `TIMETEST${i}`;
    const result = generateAllPuzzles(seed, 'normal');
    timeResults.push(result.totalGenerationTime);
  }

  const avgTime = timeResults.reduce((a, b) => a + b, 0) / timeResults.length;
  const maxTime = Math.max(...timeResults);
  const lastIdx = results.length - 1;
  results[lastIdx].passed = avgTime < 500;
  results[lastIdx].message = `平均生成时间: ${avgTime.toFixed(2)}ms, 最大: ${maxTime.toFixed(2)}ms`;
  results[lastIdx].details = { avgTime, maxTime, times: timeResults };

  return results;
};

const runSolvabilityTests = (): TestResult[] => {
  const results: TestResult[] = [];

  const difficulties: DifficultyLevel[] = ['easy', 'normal', 'hard'];
  const testCounts = { easy: 200, normal: 200, hard: 200 };

  for (const difficulty of difficulties) {
    const count = testCounts[difficulty];
    results.push({
      name: `${DIFFICULTY_CONFIGS[difficulty].label}难度 - ${count}道谜题可解性`,
      passed: false,
      message: '',
    });

    let solvable = 0;
    let failedSeeds: string[] = [];

    for (let i = 0; i < count; i++) {
      const seed = `${difficulty}_${i.toString().padStart(5, '0')}`;
      try {
        generateAllPuzzles(seed, difficulty);
        solvable++;
      } catch (e) {
        failedSeeds.push(seed);
      }
    }

    const rate = solvable / count;
    const lastIdx = results.length - 1;
    results[lastIdx].passed = rate >= 0.99;
    results[lastIdx].message = `可解率: ${(rate * 100).toFixed(2)}% (${solvable}/${count})`;
    results[lastIdx].details = {
      solvable,
      total: count,
      rate,
      failedSeeds: failedSeeds.slice(0, 10),
    };
  }

  return results;
};

const runDifficultyTests = (): TestResult[] => {
  const results: TestResult[] = [];

  results.push({
    name: '简单难度状态空间 ≤ 100',
    passed: false,
    message: '',
  });

  let easyInRange = 0;
  const easyCount = 100;
  let easyStateSpaces: number[] = [];

  for (let i = 0; i < easyCount; i++) {
    const seed = `EASYDIFF${i}`;
    try {
      const result = generateAllPuzzles(seed, 'easy');
      const spaces = result.puzzles.slice(0, 4).map((p) => p.stateSpaceSize);
      easyStateSpaces.push(...spaces);
      const allInRange = spaces.every((s) => s <= 100);
      if (allInRange) easyInRange++;
    } catch (e) {
      // 跳过生成失败的
    }
  }

  const easyRate = easyInRange / easyCount;
  results[0].passed = easyRate >= 0.9;
  results[0].message = `符合难度的比例: ${(easyRate * 100).toFixed(1)}%, 状态空间范围: ${Math.min(...easyStateSpaces)} - ${Math.max(...easyStateSpaces)}`;
  results[0].details = { easyStateSpaces };

  results.push({
    name: '普通难度状态空间 100-1000',
    passed: false,
    message: '',
  });

  let normalInRange = 0;
  const normalCount = 100;
  let normalStateSpaces: number[] = [];

  for (let i = 0; i < normalCount; i++) {
    const seed = `NORMDIFF${i}`;
    try {
      const result = generateAllPuzzles(seed, 'normal');
      const spaces = result.puzzles.slice(0, 4).map((p) => p.stateSpaceSize);
      normalStateSpaces.push(...spaces);
      const allInRange = spaces.every((s) => s > 100 && s <= 1000);
      if (allInRange) normalInRange++;
    } catch (e) {
      // 跳过
    }
  }

  const normalRate = normalInRange / normalCount;
  results[1].passed = normalRate >= 0.8;
  results[1].message = `符合难度的比例: ${(normalRate * 100).toFixed(1)}%, 状态空间范围: ${Math.min(...normalStateSpaces)} - ${Math.max(...normalStateSpaces)}`;
  results[1].details = { normalStateSpaces };

  results.push({
    name: '困难难度状态空间 > 1000',
    passed: false,
    message: '',
  });

  let hardInRange = 0;
  const hardCount = 100;
  let hardStateSpaces: number[] = [];
  let hardOptimalSteps: number[] = [];

  for (let i = 0; i < hardCount; i++) {
    const seed = `HARDDIFF${i}`;
    try {
      const result = generateAllPuzzles(seed, 'hard');
      const spaces = result.puzzles.slice(0, 4).map((p) => p.stateSpaceSize);
      const steps = result.puzzles.slice(0, 4).map((p) => p.optimalSteps);
      hardStateSpaces.push(...spaces);
      hardOptimalSteps.push(...steps);
      const allInRange = spaces.every((s) => s > 1000);
      const allStepsValid = steps.every((s) => s <= 15);
      if (allInRange && allStepsValid) hardInRange++;
    } catch (e) {
      // 跳过
    }
  }

  const hardRate = hardInRange / hardCount;
  results[2].passed = hardRate >= 0.7;
  results[2].message = `符合难度的比例: ${(hardRate * 100).toFixed(1)}%, 状态空间范围: ${Math.min(...hardStateSpaces)} - ${Math.max(...hardStateSpaces)}, 最优解步数: ${Math.min(...hardOptimalSteps)} - ${Math.max(...hardOptimalSteps)}`;
  results[2].details = { hardStateSpaces, hardOptimalSteps };

  return results;
};

const runSeedConsistencyTest = (): TestResult => {
  const seed = 'CONSISTENCY100';
  let allConsistent = true;
  let firstResult: any = null;

  for (let i = 0; i < 100; i++) {
    const result = generateAllPuzzles(seed, 'normal');
    if (i === 0) {
      firstResult = JSON.stringify(result.puzzles);
    } else {
      const currentResult = JSON.stringify(result.puzzles);
      if (currentResult !== firstResult) {
        allConsistent = false;
        break;
      }
    }
  }

  return {
    name: '同一种子100次生成完全一致',
    passed: allConsistent,
    message: allConsistent
      ? '同一种子连续100次生成的谜题完全一致'
      : '同一种子生成的谜题不一致',
  };
};

const runLockPuzzleTest = (): TestResult => {
  const results: boolean[] = [];

  for (let i = 0; i < 50; i++) {
    const seed = `LOCKTEST${i}`;
    const result = generateAllPuzzles(seed, 'normal');
    const lockCode = result.puzzles[4].data.correctCode;
    const clues = result.puzzles.slice(0, 4).map((p) => p.clue);
    const expectedCode = clues.join('');
    results.push(lockCode === expectedCode);
  }

  const allMatch = results.every((r) => r);
  return {
    name: '密码房间密码与前四关线索一致',
    passed: allMatch,
    message: allMatch
      ? '所有测试中密码都与前四关线索正确对应'
      : '存在密码与线索不匹配的情况',
    details: {
      total: results.length,
      correct: results.filter(Boolean).length,
    },
  };
};

const main = () => {
  console.log('='.repeat(70));
  console.log('墨家密室 - 谜题随机生成系统验收测试');
  console.log('='.repeat(70));
  console.log();

  const allResults: TestResult[] = [];

  console.log('📊 第一部分：PRNG 伪随机数生成器测试');
  console.log('-'.repeat(50));
  const prngResults = runPRNGTests();
  allResults.push(...prngResults);
  prngResults.forEach((r) => {
    console.log(`${r.passed ? '✅' : '❌'} ${r.name}`);
    console.log(`   ${r.message}`);
  });
  console.log();

  console.log('🎮 第二部分：谜题生成测试');
  console.log('-'.repeat(50));
  const genResults = runGenerationTests();
  allResults.push(...genResults);
  genResults.forEach((r) => {
    console.log(`${r.passed ? '✅' : '❌'} ${r.name}`);
    console.log(`   ${r.message}`);
  });
  console.log();

  console.log('🔍 第三部分：可解性验证测试');
  console.log('-'.repeat(50));
  const solvabilityResults = runSolvabilityTests();
  allResults.push(...solvabilityResults);
  solvabilityResults.forEach((r) => {
    console.log(`${r.passed ? '✅' : '❌'} ${r.name}`);
    console.log(`   ${r.message}`);
  });
  console.log();

  console.log('📈 第四部分：难度分布测试');
  console.log('-'.repeat(50));
  const difficultyResults = runDifficultyTests();
  allResults.push(...difficultyResults);
  difficultyResults.forEach((r) => {
    console.log(`${r.passed ? '✅' : '⚠️'} ${r.name}`);
    console.log(`   ${r.message}`);
  });
  console.log();

  console.log('🔄 第五部分：种子一致性测试');
  console.log('-'.repeat(50));
  const consistencyResult = runSeedConsistencyTest();
  allResults.push(consistencyResult);
  console.log(`${consistencyResult.passed ? '✅' : '❌'} ${consistencyResult.name}`);
  console.log(`   ${consistencyResult.message}`);
  console.log();

  console.log('🔐 第六部分：密码房间验证');
  console.log('-'.repeat(50));
  const lockResult = runLockPuzzleTest();
  allResults.push(lockResult);
  console.log(`${lockResult.passed ? '✅' : '❌'} ${lockResult.name}`);
  console.log(`   ${lockResult.message}`);
  console.log();

  const passed = allResults.filter((r) => r.passed).length;
  const total = allResults.length;

  console.log('='.repeat(70));
  console.log('📋 测试总结');
  console.log('='.repeat(70));
  console.log(`总测试项: ${total}`);
  console.log(`通过: ${passed}`);
  console.log(`未通过: ${total - passed}`);
  console.log(`通过率: ${((passed / total) * 100).toFixed(1)}%`);
  console.log();

  if (passed === total) {
    console.log('🎉 所有测试通过！谜题生成系统满足验收标准。');
  } else {
    console.log('⚠️ 部分测试未通过，请检查相关问题。');
  }

  const failedTests = allResults.filter((r) => !r.passed);
  if (failedTests.length > 0) {
    console.log();
    console.log('未通过的测试:');
    failedTests.forEach((r) => {
      console.log(`  - ${r.name}: ${r.message}`);
    });
  }

  process.exit(passed === total ? 0 : 1);
};

main();
