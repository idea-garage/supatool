// readline import removed - using raw mode instead

// Wildcard matching function
export function wildcardMatch(str: string, pattern: string): boolean {
  if (pattern === '*') {
    return true;
  }
  
  // Exact match if pattern contains no wildcards
  if (!pattern.includes('*') && !pattern.includes('?')) {
    return str === pattern;
  }
  
  // Simple wildcard pattern matching
  const regexPattern = pattern
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(str);
}

export interface ConfirmationOptions {
  allowAll?: boolean;
  message?: string;
}

/**
 * Ask user for confirmation (immediate single character input)
 */
export function askUserConfirmation(
  message: string, 
  options?: ConfirmationOptions
): Promise<boolean | 'all'> {
  return new Promise((resolve) => {
    const promptMessage = options?.message || '(y/N): ';
    process.stdout.write(`${message} ${promptMessage}`);

    // Enable raw mode to receive single character input
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const onData = (key: string) => {
      // Cleanup
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
        // n, Enter, or Ctrl+C
        if (key === '\u0003') {
          console.log('\nOperation cancelled');
          process.exit(0);
        }
        console.log(lowerKey === 'n' ? 'n' : 'N');
        resolve(false);
      } else {
        // Invalid key: default to false
        console.log(`${key} (invalid input, treating as N)`);
        resolve(false);
      }
    };

    process.stdin.on('data', onData);
  });
} 