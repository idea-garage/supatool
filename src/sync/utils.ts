// readline import removed - using raw mode instead

// ワイルドカードマッチング関数
export function wildcardMatch(str: string, pattern: string): boolean {
  return pattern === '*' || str.includes(pattern);
}

export interface ConfirmationOptions {
  allowAll?: boolean;
  message?: string;
}

/**
 * ユーザーに確認を求める（1文字入力で即座に判定）
 */
export function askUserConfirmation(
  message: string, 
  options?: ConfirmationOptions
): Promise<boolean | 'all'> {
  return new Promise((resolve) => {
    const promptMessage = options?.message || '(y/N): ';
    process.stdout.write(`${message} ${promptMessage}`);

    // rawモードを有効にして1文字入力を受け取る
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const onData = (key: string) => {
      // クリーンアップ
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener('data', onData);

      const lowerKey = key.toLowerCase();
      
      if (lowerKey === 'y') {
        console.log('y');
        resolve(true);
      } else if (options?.allowAll && lowerKey === 'a') {
        console.log('a');
        resolve('all');
      } else if (lowerKey === 'n' || key === '\r' || key === '\n' || key === '\u0003') {
        // n、Enter、または Ctrl+C
        if (key === '\u0003') {
          console.log('\nOperation cancelled');
          process.exit(0);
        }
        console.log(lowerKey === 'n' ? 'n' : 'N');
        resolve(false);
      } else {
        // 無効なキー：デフォルトでfalse
        console.log(`${key} (invalid input, treating as N)`);
        resolve(false);
      }
    };

    process.stdin.on('data', onData);
  });
} 