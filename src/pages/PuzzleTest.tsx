import { useState, useEffect, useCallback } from 'react';
import { generateAllPuzzles } from '@/puzzle/puzzleGenerator';
import { SeededRandom, generateRandomSeed, DIFFICULTY_CONFIGS } from '@/utils/prng';
import type { DifficultyLevel } from '@/utils/prng';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

export default function PuzzleTest() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState('');
  const [progress, setProgress] = useState(0);

  const runPRNGTests = useCallback((): TestResult[] => {
    const results: TestResult[] = [];

    const seed = 'TEST1234';
    const rng1 = new SeededRandom(seed);
    const rng2 = new SeededRandom(seed);
    const values1 = Array.from({ length: 100 }, () => rng1.next());
    const values2 = Array.from({ length: 100 }, () => rng2.next());
    const consistent = values1.every((v, i) => v === values2[i]);

    results.push({
      name: 'PRNG 种子一致性',
      passed: consistent,
      message: consistent
        ? '同一种子生成100个随机数完全一致'
        : '同一种子生成的随机数不一致',
    });

    const strRng1 = new SeededRandom('HELLO');
    const strRng2 = new SeededRandom('HELLO');
    const strConsistent = strRng1.next() === strRng2.next();

    results.push({
      name: 'PRNG 字符串种子',
      passed: strConsistent,
      message: strConsistent
        ? '字符串种子可以正确生成随机数'
        : '字符串种子生成失败',
    });

    const diffRng1 = new SeededRandom('SEED1');
    const diffRng2 = new SeededRandom('SEED2');
    const diffValues1 = Array.from({ length: 10 }, () => diffRng1.next());
    const diffValues2 = Array.from({ length: 10 }, () => diffRng2.next());
    const different = diffValues1.some((v, i) => v !== diffValues2[i]);

    results.push({
      name: 'PRNG 不同种子',
      passed: different,
      message: different
        ? '不同种子生成不同的随机序列'
        : '不同种子生成了相同的序列',
    });

    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const shuffled1 = new SeededRandom('SHUFFLE').shuffle([...arr]);
    const shuffled2 = new SeededRandom('SHUFFLE').shuffle([...arr]);
    const shuffledConsistent = shuffled1.every((v, i) => v === shuffled2[i]);

    results.push({
      name: 'PRNG shuffle 方法',
      passed: shuffledConsistent,
      message: shuffledConsistent
        ? 'shuffle 方法具有种子一致性'
        : 'shuffle 方法不具有种子一致性',
    });

    const intRng = new SeededRandom('INTTEST');
    const intValues = Array.from({ length: 1000 }, () => intRng.nextInt(1, 10));
    const allInRange = intValues.every((v) => v >= 1 && v <= 10 && Number.isInteger(v));

    results.push({
      name: 'PRNG nextInt 范围',
      passed: allInRange,
      message: allInRange
        ? 'nextInt 生成的值都在指定范围内'
        : 'nextInt 生成的值超出了指定范围',
    });

    return results;
  }, []);

  const runGenerationTests = useCallback((): TestResult[] => {
    const results: TestResult[] = [];
    const difficulties: DifficultyLevel[] = ['easy', 'normal', 'hard'];

    for (const difficulty of difficulties) {
      try {
        const seed = `${difficulty.toUpperCase()}_TEST`;
        const result = generateAllPuzzles(seed, difficulty);
        results.push({
          name: `${DIFFICULTY_CONFIGS[difficulty].label}难度 - 谜题生成`,
          passed: result.puzzles.length === 5,
          message: `成功生成5个房间的谜题，总耗时 ${result.totalGenerationTime.toFixed(2)}ms`,
          details: {
            totalTime: result.totalGenerationTime,
            roomTimes: result.roomTimes,
          },
        });
      } catch (e: any) {
        results.push({
          name: `${DIFFICULTY_CONFIGS[difficulty].label}难度 - 谜题生成`,
          passed: false,
          message: `生成失败: ${e.message || e}`,
        });
      }
    }

    const timeResults: number[] = [];
    for (let i = 0; i < 10; i++) {
      const seed = `TIMETEST${i}`;
      const result = generateAllPuzzles(seed, 'normal');
      timeResults.push(result.totalGenerationTime);
    }

    const avgTime = timeResults.reduce((a, b) => a + b, 0) / timeResults.length;
    const maxTime = Math.max(...timeResults);

    results.push({
      name: '单局生成时间 < 500ms',
      passed: avgTime < 500,
      message: `平均生成时间: ${avgTime.toFixed(2)}ms, 最大: ${maxTime.toFixed(2)}ms`,
      details: { avgTime, maxTime, times: timeResults },
    });

    return results;
  }, []);

  const runSolvabilityTests = useCallback(async (
    updateProgress: (current: number, total: number) => void,
  ): Promise<TestResult[]> => {
    const results: TestResult[] = [];
    const difficulties: DifficultyLevel[] = ['easy', 'normal', 'hard'];
    const testCounts = { easy: 200, normal: 200, hard: 200 };
    const total = testCounts.easy + testCounts.normal + testCounts.hard;
    let done = 0;

    for (const difficulty of difficulties) {
      const count = testCounts[difficulty];
      let solvable = 0;
      const failedSeeds: string[] = [];

      for (let i = 0; i < count; i++) {
        const seed = `${difficulty}_${i.toString().padStart(5, '0')}`;
        try {
          generateAllPuzzles(seed, difficulty);
          solvable++;
        } catch (e) {
          failedSeeds.push(seed);
        }
        done++;
        if (i % 10 === 0) {
          updateProgress(done, total);
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      const rate = solvable / count;
      results.push({
        name: `${DIFFICULTY_CONFIGS[difficulty].label}难度 - ${count}道谜题可解性`,
        passed: rate >= 0.99,
        message: `可解率: ${(rate * 100).toFixed(2)}% (${solvable}/${count})`,
        details: {
          solvable,
          total: count,
          rate,
          failedSeeds: failedSeeds.slice(0, 10),
        },
      });
    }

    return results;
  }, []);

  const runDifficultyTests = useCallback(async (
    updateProgress: (current: number, total: number) => void,
  ): Promise<TestResult[]> => {
    const results: TestResult[] = [];
    const total = 300;
    let done = 0;

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
        // 跳过
      }
      done++;
      if (i % 10 === 0) {
        updateProgress(done, total);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    const easyRate = easyInRange / easyCount;
    results.push({
      name: '简单难度状态空间 ≤ 100',
      passed: easyRate >= 0.9,
      message: `符合难度的比例: ${(easyRate * 100).toFixed(1)}%, 状态空间范围: ${Math.min(...easyStateSpaces)} - ${Math.max(...easyStateSpaces)}`,
      details: { easyStateSpaces },
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
      done++;
      if (i % 10 === 0) {
        updateProgress(done, total);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    const normalRate = normalInRange / normalCount;
    results.push({
      name: '普通难度状态空间 100-1000',
      passed: normalRate >= 0.8,
      message: `符合难度的比例: ${(normalRate * 100).toFixed(1)}%, 状态空间范围: ${Math.min(...normalStateSpaces)} - ${Math.max(...normalStateSpaces)}`,
      details: { normalStateSpaces },
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
      done++;
      if (i % 10 === 0) {
        updateProgress(done, total);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    const hardRate = hardInRange / hardCount;
    results.push({
      name: '困难难度状态空间 > 1000 且最优解 ≤ 15步',
      passed: hardRate >= 0.7,
      message: `符合难度的比例: ${(hardRate * 100).toFixed(1)}%, 状态空间范围: ${Math.min(...hardStateSpaces)} - ${Math.max(...hardStateSpaces)}, 最优解步数: ${Math.min(...hardOptimalSteps)} - ${Math.max(...hardOptimalSteps)}`,
      details: { hardStateSpaces, hardOptimalSteps },
    });

    return results;
  }, []);

  const runSeedConsistencyTest = useCallback((): TestResult => {
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
  }, []);

  const runLockPuzzleTest = useCallback((): TestResult => {
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
  }, []);

  const runAllTests = useCallback(async () => {
    setRunning(true);
    setResults([]);
    const allResults: TestResult[] = [];

    setCurrentTest('PRNG 伪随机数生成器测试');
    setProgress(0);
    const prngResults = runPRNGTests();
    allResults.push(...prngResults);
    setResults([...allResults]);

    setCurrentTest('谜题生成测试');
    setProgress(10);
    const genResults = runGenerationTests();
    allResults.push(...genResults);
    setResults([...allResults]);

    setCurrentTest('可解性验证测试 (600道谜题)');
    setProgress(20);
    const solvabilityResults = await runSolvabilityTests((current, total) => {
      setProgress(20 + Math.floor((current / total) * 35));
    });
    allResults.push(...solvabilityResults);
    setResults([...allResults]);

    setCurrentTest('难度分布测试 (300道谜题)');
    setProgress(55);
    const difficultyResults = await runDifficultyTests((current, total) => {
      setProgress(55 + Math.floor((current / total) * 30));
    });
    allResults.push(...difficultyResults);
    setResults([...allResults]);

    setCurrentTest('种子一致性测试');
    setProgress(85);
    const consistencyResult = runSeedConsistencyTest();
    allResults.push(consistencyResult);
    setResults([...allResults]);

    setCurrentTest('密码房间验证');
    setProgress(95);
    const lockResult = runLockPuzzleTest();
    allResults.push(lockResult);
    setResults([...allResults]);

    setProgress(100);
    setCurrentTest('');
    setRunning(false);
  }, [runPRNGTests, runGenerationTests, runSolvabilityTests, runDifficultyTests, runSeedConsistencyTest, runLockPuzzleTest]);

  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;

  return (
    <div className="min-h-screen bg-[#1a1410] p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl text-[#e8c07d] font-bold mb-6 text-center">
          谜题随机生成系统 - 验收测试
        </h1>

        <div className="mb-6 text-center">
          <button
            onClick={runAllTests}
            disabled={running}
            className={`px-8 py-3 rounded-lg text-lg font-bold transition-all ${
              running
                ? 'bg-[#555] text-[#888] cursor-not-allowed'
                : 'bg-gradient-to-r from-[#8b6914] to-[#cd7f32] border-2 border-[#e8c07d] text-white hover:from-[#a07a1a] hover:to-[#e8c07d]'
            }`}
          >
            {running ? `运行中... ${currentTest}` : '开始验收测试'}
          </button>
        </div>

        {running && (
          <div className="mb-6">
            <div className="w-full bg-[#2a1f18] rounded-full h-4 border border-[#8b7355]">
              <div
                className="bg-gradient-to-r from-[#cd7f32] to-[#e8c07d] h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-center text-[#8b7355] mt-2">{progress}%</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="bg-[#2a1f18] border-2 border-[#cd7f32] rounded-xl p-6 mb-6">
            <h2 className="text-xl text-[#e8c07d] font-bold mb-4">测试总结</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-[#1a1410] rounded-lg p-4">
                <div className="text-3xl font-bold text-[#d4c4a8]">{totalCount}</div>
                <div className="text-[#8b7355]">总测试项</div>
              </div>
              <div className="bg-[#1a1410] rounded-lg p-4">
                <div className="text-3xl font-bold text-[#4a7c59]">{passedCount}</div>
                <div className="text-[#8b7355]">通过</div>
              </div>
              <div className="bg-[#1a1410] rounded-lg p-4">
                <div className="text-3xl font-bold text-[#cd7f32]">
                  {totalCount > 0 ? ((passedCount / totalCount) * 100).toFixed(1) : 0}%
                </div>
                <div className="text-[#8b7355]">通过率</div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {results.map((result, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-2 ${
                result.passed
                  ? 'bg-[#2d4a3e]/30 border-[#4a7c59]'
                  : 'bg-[#5c2b2b]/30 border-[#8b3a3a]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{result.passed ? '✅' : '❌'}</span>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-[#d4c4a8]">{result.name}</h3>
                  <p className="text-[#8b7355]">{result.message}</p>
                </div>
              </div>
              {result.details && (
                <details className="mt-2 text-sm text-[#8b7355]">
                  <summary className="cursor-pointer hover:text-[#d4c4a8]">查看详情</summary>
                  <pre className="mt-2 p-2 bg-[#1a1410] rounded overflow-x-auto">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
