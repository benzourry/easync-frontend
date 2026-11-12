/**
 * Bounded undo/redo stack of immutable entries. The first entry is the state the
 * document started in, so `undo()` always has something to roll back to.
 */
export class HistoryStack<T> {
  private entries: T[] = [];
  private cursor = -1;

  constructor(
    private readonly limit = 60,
    private readonly isSame: (a: T, b: T) => boolean = (a, b) => a === b,
  ) {}

  get canUndo(): boolean {
    return this.cursor > 0;
  }

  get canRedo(): boolean {
    return this.cursor >= 0 && this.cursor < this.entries.length - 1;
  }

  /** Starts a fresh timeline whose only state is `initial`. */
  reset(initial: T | null = null): void {
    this.entries = initial === null ? [] : [initial];
    this.cursor = initial === null ? -1 : 0;
  }

  /** Appends a state, discarding any redo branch and ignoring no-op changes. */
  push(entry: T): boolean {
    if (this.cursor >= 0 && this.isSame(this.entries[this.cursor], entry)) return false;

    this.entries.splice(this.cursor + 1);
    this.entries.push(entry);
    if (this.entries.length > this.limit) this.entries.shift();
    this.cursor = this.entries.length - 1;
    return true;
  }

  undo(): T | null {
    if (!this.canUndo) return null;
    this.cursor -= 1;
    return this.entries[this.cursor];
  }

  redo(): T | null {
    if (!this.canRedo) return null;
    this.cursor += 1;
    return this.entries[this.cursor];
  }

  current(): T | null {
    return this.cursor >= 0 ? this.entries[this.cursor] : null;
  }
}
