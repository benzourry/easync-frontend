import { HistoryStack } from './history-stack';

describe('HistoryStack', () => {
  it('starts empty and cannot undo or redo', () => {
    const stack = new HistoryStack<string>();
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(false);
    expect(stack.undo()).toBeNull();
    expect(stack.redo()).toBeNull();
  });

  it('treats the seeded state as a baseline instead of an undo step', () => {
    const stack = new HistoryStack<string>();
    stack.reset('a');
    expect(stack.canUndo).toBe(false);
    expect(stack.current()).toBe('a');

    stack.push('b');
    expect(stack.canUndo).toBe(true);
    expect(stack.undo()).toBe('a');
    expect(stack.redo()).toBe('b');
  });

  it('ignores duplicate states', () => {
    const stack = new HistoryStack<string>();
    stack.reset('a');
    expect(stack.push('a')).toBe(false);
    expect(stack.push('b')).toBe(true);
    expect(stack.push('b')).toBe(false);
    expect(stack.undo()).toBe('a');
  });

  it('drops the redo branch when a new state is pushed', () => {
    const stack = new HistoryStack<string>();
    stack.reset('a');
    stack.push('b');
    stack.push('c');
    stack.undo();
    stack.push('d');
    expect(stack.canRedo).toBe(false);
    expect(stack.redo()).toBeNull();
    expect(stack.current()).toBe('d');
  });

  it('keeps at most `limit` entries and still allows undoing to the oldest one', () => {
    const stack = new HistoryStack<number>(3);
    stack.reset(0);
    stack.push(1);
    stack.push(2);
    stack.push(3);
    expect(stack.undo()).toBe(2);
    expect(stack.undo()).toBe(1);
    expect(stack.canUndo).toBe(false);
  });
});
