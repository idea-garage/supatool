# Changelog

All notable changes to this project will be documented in this file.

## [0.0.1] - 2025-02-09
- Initial version
- Support for dynamic schema name retrieval

## [0.0.2] - 2025-02-18
- Support for CRUD generation for views

## [0.0.3] - 2025-02-19
- Adjust CRUD generation

## [0.0.4] - 2025-03-17
- Output type definitions to shared folder

## [0.1.0-2] - 2025-04-20
- First public release.
- Generate TypeScript CRUD code from Supabase type definitions.
- Support for table filtering with `-t, --tables` option.
- Output folder and import path options.
- Overwrite confirmation with `--force`/`-f`.

## [0.3.0] - 2025-01-XX
### Added
- **Performance Optimization**: Significantly improved table processing speed through parallel query execution
- **Batch Processing**: Implemented concurrent table processing with configurable limits (default: 20, max: 50)
- **Progress Display**: Enhanced UI with animated progress bars, rotating spinners, and real-time updates
- **Environment Variables**: Added `SUPATOOL_MAX_CONCURRENT` for controlling parallel processing limits
- **Comprehensive Error Handling**: Better error reporting and debug logging for failed operations

### Improved
- **Query Performance**: 5x speedup from parallel query execution per table
- **File Operations**: Parallel file writing for faster completion  
- **User Experience**: Smooth, real-time progress updates with Supabase-themed animations
- **English Localization**: All user-facing messages now in English

### Technical
- Query-level parallelization using `Promise.all` for table DDL generation
- Table-level batch processing with configurable concurrency limits
- Optimized progress display with carriage return positioning
- Comprehensive error handling for individual table failures 