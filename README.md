# Satisfactory Production Planning Tool

This is a tool to help you plan your production lines in Satisfactory.

> [!CAUTION]
> This project is still in early development and is not ready for use.

## Planned Features

- Node based editor to create production lines
- Import production lines & unlocked recipes from save files
- Optimized production lines based on existing production lines to minimize the number of machines/size/time required.

## Requirements

- Node.js 18.0.0 or higher
- Pnpm 8.0.0 or higher

## Development

### Setup

1. Clone the repository
2. Run `pnpm install` to install dependencies
3. Link [satisfactory-file](https://github.com/PlutoyDev/satisfactory-file) library as it has yet to be published.
4. Copy docs.json from Satisfactory's install directory to `res/docs.json`
5. Extract the game icon [using FModel](./docs/extracting-icon.md) or similar into `res/extracted`
6. Run `pnpm dev` to start the development server
