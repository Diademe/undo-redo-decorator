# Changelog

## [Unreleased]

### Added

### Changed

## [1.5.2]

### Added

- typed exceptions

### Changed

- performance optimisation

### Removed

## [1.5.1]

module: from "commonjs" to "ES2020" for angular 10 compatibility.

## [1.5.0]

### Added

- `collapse(N)`: you can collapse states (states are created by calling `save()`) from `N` to the last state

### Removed

- custom collection (set and map). they are no longer needed as UndoRedo support native collection.
- `__originalConstructor__` as undo redo no longer extends the prototype chain.
