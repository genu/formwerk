import { MaybeRefOrGetter, toValue, watch } from 'vue';
import { Arrayable, Maybe } from '../../types';
import { normalizeArrayable, tryOnScopeDispose } from '../../utils/common';

interface ListenerOptions {
  disabled?: MaybeRefOrGetter<boolean | undefined>;
  passive?: boolean;
}

export type EventExpression = string | [string, (e: Event) => boolean];

export function useEventListener<TEvent extends Event>(
  targetRef: MaybeRefOrGetter<Arrayable<Maybe<EventTarget>>>,
  event: Arrayable<EventExpression>,
  listener: (e: TEvent) => unknown,
  opts?: ListenerOptions,
) {
  let controller: AbortController | undefined;
  function cleanup() {
    controller?.abort();
  }

  function setup(target: Arrayable<EventTarget>) {
    if (toValue(opts?.disabled)) {
      return;
    }

    controller = new AbortController();
    const events = normalizeArrayable(event);
    const listenerOpts = { signal: controller.signal, passive: toValue(opts?.passive) };
    events.forEach(evt => {
      normalizeArrayable(target).forEach(el => {
        if (typeof evt === 'string') {
          el.addEventListener(evt, listener as EventListener, listenerOpts);
          return;
        }

        const [evtName, predicate] = evt;
        el.addEventListener(
          evtName,
          e => {
            if (predicate(e)) {
              listener(e as TEvent);
            }
          },
          listenerOpts,
        );
      });
    });
  }

  const stopWatch = watch(
    () => [toValue(targetRef), toValue(opts?.disabled)] as const,
    ([el, disabled]) => {
      cleanup();
      if (disabled) {
        return;
      }

      const targets = normalizeArrayable(el).filter(elm => !!elm);
      setup(targets);
    },
    { immediate: true },
  );

  tryOnScopeDispose(() => {
    cleanup();
    stopWatch();
  });
}
