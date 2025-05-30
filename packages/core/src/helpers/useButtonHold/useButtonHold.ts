import { MaybeRefOrGetter, toValue } from 'vue';
import { tryOnScopeDispose } from '../../utils/common';

export interface ButtonHoldOptions {
  onHoldTick: (e: MouseEvent) => void;
  onClick: (e: MouseEvent) => void;

  disabled?: MaybeRefOrGetter<boolean>;

  /**
   * Number of ticks per second, cannot be 0, defaults to 100.
   */
  tickRate?: number;
}

export function useButtonHold(opts: ButtonHoldOptions) {
  let interval: number;
  let timeout: number;
  let isTicking = false;

  function executeHoldTick(e: MouseEvent) {
    if (toValue(opts.disabled)) {
      clearAll();
      return;
    }

    opts.onHoldTick(e);
  }

  function onMousedown(e: MouseEvent) {
    if (isTicking || toValue(opts.disabled)) {
      return;
    }

    clearAll();
    opts.onClick(e);
    const tickRate = opts.tickRate || 100;
    document.addEventListener('mouseup', onMouseup, { once: true });
    timeout = window.setTimeout(() => {
      isTicking = true;
      interval = window.setInterval(() => executeHoldTick(e), tickRate);
    }, tickRate);
  }

  function onMouseup() {
    clearAll();
  }

  function clearAll() {
    window.clearInterval(interval);
    window.clearTimeout(timeout);
    isTicking = false;
  }

  const buttonHoldProps = {
    onMousedown,
  };

  tryOnScopeDispose(() => {
    document.removeEventListener('mouseup', onMouseup);
    clearAll();
  });

  return buttonHoldProps;
}
