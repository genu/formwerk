import { computed, CSSProperties, defineComponent, h, inject, shallowRef, toValue } from 'vue';
import { Reactivify } from '../types';
import { hasKeyCode, isNullOrUndefined, normalizeProps, useUniqId, withRefCapture } from '../utils/common';
import { DateTimeSegmentGroupKey } from './useDateTimeSegmentGroup';
import { FieldTypePrefixes } from '../constants';
import { blockEvent } from '../utils/events';
import { DateTimeSegmentType } from './types';
import { isEditableSegmentType } from './constants';
import { createDisabledContext } from '../helpers/createDisabledContext';

export interface DateTimeSegmentProps {
  /**
   * The type of the segment.
   */
  type: DateTimeSegmentType;

  /**
   * The text value of the segment.
   */
  value: string;

  /**
   * Whether the segment is disabled.
   */
  disabled?: boolean;

  /**
   * Whether the segment is readonly.
   */
  readonly?: boolean;
}

interface DateTimeSegmentDomProps {
  id: string;
  tabindex: number;
  role?: string;
  contenteditable: string | undefined;
  'aria-disabled': boolean | undefined;
  'aria-readonly': boolean | undefined;
  'data-segment-type': DateTimeSegmentType;
  style: CSSProperties;
  'aria-label'?: string;
  spellcheck?: boolean;
  inputmode?: string;
  autocorrect?: string;
  enterkeyhint?: string;
  'aria-valuemin'?: number;
  'aria-valuemax'?: number;
  'aria-valuenow'?: number;
  'aria-valuetext'?: string;
}

export function useDateTimeSegment(_props: Reactivify<DateTimeSegmentProps>) {
  const props = normalizeProps(_props);
  const id = useUniqId(FieldTypePrefixes.DateTimeSegment);
  const segmentEl = shallowRef<HTMLSpanElement>();
  const segmentGroup = inject(DateTimeSegmentGroupKey, null);
  const isDisabled = createDisabledContext(props.disabled);
  const isNonEditable = () => isDisabled.value || !isEditableSegmentType(toValue(props.type));

  if (!segmentGroup) {
    throw new Error('DateTimeSegmentGroup is not provided');
  }

  const {
    increment,
    decrement,
    setValue,
    getMetadata,
    onDone,
    parser,
    clear,
    onTouched,
    isLast,
    focusNext,
    isNumeric,
  } = segmentGroup.useDateSegmentRegistration({
    id,
    getElem: () => segmentEl.value,
    getType: () => toValue(props.type),
  });

  let currentInput = '';

  const handlers = {
    onFocus() {
      // Reset the current input when the segment is focused
      currentInput = '';
    },
    onBeforeinput(evt: InputEvent) {
      if (toValue(props.readonly) || isDisabled.value) {
        blockEvent(evt);
        return;
      }

      // No data,like backspace or whatever
      if (isNullOrUndefined(evt.data)) {
        return;
      }

      blockEvent(evt);
      if (!isNumeric()) {
        return;
      }

      const nextValue = currentInput + evt.data;
      currentInput = nextValue;

      const parsed = parser.parse(nextValue);
      const { min, max, maxLength } = getMetadata();
      if (isNullOrUndefined(min) || isNullOrUndefined(max) || isNullOrUndefined(maxLength)) {
        return;
      }

      if (Number.isNaN(parsed) || parsed > max) {
        return;
      }

      if (segmentEl.value) {
        segmentEl.value.textContent = currentInput;
      }

      // If the current input length is greater than or equal to the max length, or the parsed value is greater than the max value,
      // then we should signal the segment group that this segment is done and it can move to the next segment
      if (currentInput.length >= maxLength || parsed * 10 > max) {
        onDone();
      }
    },
    onBlur() {
      onTouched();
      const { min, max } = getMetadata();
      if (isNullOrUndefined(min) || isNullOrUndefined(max)) {
        return;
      }

      const parsed = parser.parse(segmentEl.value?.textContent || '');
      if (!Number.isNaN(parsed) && parsed >= min && parsed <= max) {
        setValue(parsed);
      }

      // Reset the current input when the segment is blurred
      currentInput = '';
    },
    onKeydown(evt: KeyboardEvent) {
      if (toValue(props.readonly) || isDisabled.value) {
        return;
      }

      if (hasKeyCode(evt, 'Enter')) {
        blockEvent(evt);
        focusNext();
        return;
      }

      if (hasKeyCode(evt, 'ArrowUp')) {
        blockEvent(evt);
        if (!isNonEditable()) {
          increment();
        }
        return;
      }

      if (hasKeyCode(evt, 'ArrowDown')) {
        blockEvent(evt);
        if (!isNonEditable()) {
          decrement();
        }
        return;
      }

      if (hasKeyCode(evt, 'Backspace') || hasKeyCode(evt, 'Delete')) {
        blockEvent(evt);
        if (!isNonEditable()) {
          clear();
        }
      }
    },
  };

  const segmentProps = computed(() => {
    const domProps: DateTimeSegmentDomProps = {
      id,
      tabindex: isNonEditable() ? -1 : 0,
      contenteditable: isNonEditable() ? undefined : 'plaintext-only',
      'aria-disabled': isDisabled.value,
      'data-segment-type': toValue(props.type),
      'aria-label': isNonEditable() ? undefined : toValue(props.type),
      'aria-readonly': toValue(props.readonly) ? true : undefined,
      autocorrect: isNonEditable() ? undefined : 'off',
      spellcheck: isNonEditable() ? undefined : false,
      enterkeyhint: isNonEditable() ? undefined : isLast() ? 'done' : 'next',
      inputmode: 'none',
      ...handlers,
      style: {
        caretColor: 'transparent',
      },
    };

    if (isNumeric()) {
      const { min, max } = getMetadata();
      const value = parser.parse(toValue(props.value));
      domProps.role = 'spinbutton';
      domProps.inputmode = 'numeric';
      domProps['aria-valuemin'] = min ?? undefined;
      domProps['aria-valuemax'] = max ?? undefined;
      domProps['aria-valuenow'] = Number.isNaN(value) ? undefined : value;
      domProps['aria-valuetext'] = Number.isNaN(value) ? 'Empty' : value.toString();
    }

    if (isNonEditable()) {
      domProps.style.pointerEvents = 'none';
    }

    return withRefCapture(domProps, segmentEl);
  });

  return {
    segmentProps,
  };
}

export const DateTimeSegment = defineComponent<DateTimeSegmentProps>({
  name: 'DateTimeSegment',
  props: ['type', 'value', 'disabled', 'readonly'],
  setup(props) {
    const { segmentProps } = useDateTimeSegment(props);

    return () => h('span', segmentProps.value, props.value);
  },
});
