import { computed, MaybeRefOrGetter, shallowRef, toValue } from 'vue';
import { CalendarContext, CalendarDayCell, CalendarMonthCell, CalendarViewType, CalendarYearCell } from './types';
import { useDateFormatter } from '../i18n';
import { Reactivify } from '../types';
import { normalizeProps } from '../utils/common';
import { YEAR_CELLS_COUNT } from './constants';
import { now, toCalendar, toCalendarDate } from '@internationalized/date';

export interface CalendarWeeksView {
  type: 'weeks';
  days: CalendarDayCell[];
  weekDays: string[];
}

export interface CalendarMonthsView {
  type: 'months';
  months: CalendarMonthCell[];
}

export interface CalendarYearsView {
  type: 'years';
  years: CalendarYearCell[];
}

export type CalendarView = CalendarWeeksView | CalendarMonthsView | CalendarYearsView;

export interface CalendarViewProps {
  /**
   * The format option for the days of the week.
   */
  weekDayFormat?: Intl.DateTimeFormatOptions['weekday'];

  /**
   * The format option for the month.
   */
  monthFormat?: Intl.DateTimeFormatOptions['month'];

  /**
   * The format option for the year.
   */
  yearFormat?: Intl.DateTimeFormatOptions['year'];
}

export function useCalendarView(_props: Reactivify<CalendarViewProps>, context: CalendarContext) {
  const props = normalizeProps(_props);
  const viewType = shallowRef<CalendarViewType>('weeks');
  const { days, weekDays } = useCalendarDaysView(context, props.weekDayFormat);
  const { months, monthFormatter } = useCalendarMonthsView(context, props.monthFormat);
  const { years, yearFormatter } = useCalendarYearsView(context, props.yearFormat);

  const currentView = computed(() => {
    if (viewType.value === 'weeks') {
      return {
        type: 'weeks',
        days: days.value,
        weekDays: weekDays.value,
      } as CalendarWeeksView;
    }

    if (viewType.value === 'months') {
      return {
        type: 'months',
        months: months.value,
      } as CalendarMonthsView;
    }

    return {
      type: 'years',
      years: years.value,
    } as CalendarYearsView;
  });

  function setView(type: CalendarViewType) {
    viewType.value = type;
  }

  const viewLabel = computed(() => {
    if (viewType.value === 'weeks') {
      return `${monthFormatter.value.format(context.getFocusedDate().toDate())} ${yearFormatter.value.format(context.getFocusedDate().toDate())}`;
    }

    if (viewType.value === 'months') {
      return yearFormatter.value.format(context.getFocusedDate().toDate());
    }

    return `${yearFormatter.value.format(years.value[0].value.toDate())} - ${yearFormatter.value.format(years.value[years.value.length - 1].value.toDate())}`;
  });

  return { currentView, setView, viewLabel };
}

function useCalendarDaysView(
  { weekInfo, getFocusedDate, getSelectedDate, locale, timeZone, calendar, getMinDate, getMaxDate }: CalendarContext,
  daysOfWeekFormat?: MaybeRefOrGetter<Intl.DateTimeFormatOptions['weekday']>,
) {
  const dayFormatter = useDateFormatter(locale, () => ({ weekday: toValue(daysOfWeekFormat) ?? 'short' }));
  const dayNumberFormatter = useDateFormatter(locale, () => ({ day: 'numeric' }));

  const days = computed<CalendarDayCell[]>(() => {
    const current = getSelectedDate();
    const focused = getFocusedDate();
    const startOfMonth = focused.set({ day: 1, hour: 0, minute: 0, second: 0, millisecond: 0 });

    const firstDayOfWeek = weekInfo.value.firstDay;
    const startDayOfWeek = startOfMonth.toDate().getDay();
    const daysToSubtract = (startDayOfWeek - firstDayOfWeek + 7) % 7;

    // Move to first day of week
    const firstDay = startOfMonth.subtract({ days: daysToSubtract });

    // Always use 6 weeks (42 days) for consistent layout
    const gridDays = 42;
    const rightNow = toCalendar(now(timeZone.value), calendar.value);
    const minDate = getMinDate();
    const maxDate = getMaxDate();

    const rightNowDate = toCalendarDate(rightNow);
    const focusedDate = toCalendarDate(focused);
    const currentDate = toCalendarDate(current);

    return Array.from({ length: gridDays }, (_, i) => {
      const dayOfMonth = firstDay.add({ days: i });
      let disabled = false;

      if (minDate && dayOfMonth.compare(minDate) < 0) {
        disabled = true;
      }

      if (maxDate && dayOfMonth.compare(maxDate) > 0) {
        disabled = true;
      }

      const domDate = toCalendarDate(dayOfMonth);

      return {
        value: dayOfMonth,
        label: dayNumberFormatter.value.format(dayOfMonth.toDate()),
        dayOfMonth: dayOfMonth.day,
        isToday: rightNowDate.compare(domDate) === 0,
        selected: currentDate.compare(domDate) === 0,
        isOutsideMonth: domDate.month !== focusedDate.month,
        focused: focusedDate.compare(domDate) === 0,
        disabled,
        type: 'day',
      } as CalendarDayCell;
    });
  });

  const weekDays = computed(() => {
    let focused = getFocusedDate();
    const daysPerWeek = 7;
    const firstDayOfWeek = weekInfo.value.firstDay;
    // Get the current date's day of week (0-6)
    const currentDayOfWeek = focused.toDate().getDay();

    // Calculate how many days to go back to reach first day of week
    const daysToSubtract = (currentDayOfWeek - firstDayOfWeek + 7) % 7;

    // Move current date back to first day of week
    focused = focused.subtract({ days: daysToSubtract });

    const days: string[] = [];
    for (let i = 0; i < daysPerWeek; i++) {
      days.push(dayFormatter.value.format(focused.add({ days: i }).toDate()));
    }

    return days;
  });

  return { days, weekDays, dayFormatter };
}

function useCalendarMonthsView(
  { getFocusedDate, locale, getSelectedDate, getMinDate, getMaxDate }: CalendarContext,
  monthFormat?: MaybeRefOrGetter<Intl.DateTimeFormatOptions['month']>,
) {
  const monthFormatter = useDateFormatter(locale, () => ({ month: toValue(monthFormat) ?? 'long' }));

  const months = computed<CalendarMonthCell[]>(() => {
    const focused = getFocusedDate();
    const current = getSelectedDate();
    const minDate = getMinDate();
    const maxDate = getMaxDate();

    return Array.from({ length: focused.calendar.getMonthsInYear(focused) }, (_, i) => {
      const date = focused.set({ month: i + 1, day: 1, hour: 0, minute: 0, second: 0, millisecond: 0 });
      let disabled = false;

      if (minDate && minDate.month < date.month) {
        disabled = true;
      }

      if (maxDate && maxDate.month > date.month) {
        disabled = true;
      }

      const cell: CalendarMonthCell = {
        type: 'month',
        label: monthFormatter.value.format(date.toDate()),
        value: date,
        monthOfYear: date.month,
        selected: date.month === current.month && date.year === current.year,
        focused: focused.month === date.month && focused.year === date.year,
        disabled,
      };

      return cell;
    });
  });

  return { months, monthFormatter };
}

function useCalendarYearsView(
  { getFocusedDate, locale, getSelectedDate, getMinDate, getMaxDate }: CalendarContext,
  yearFormat?: MaybeRefOrGetter<Intl.DateTimeFormatOptions['year']>,
) {
  const yearFormatter = useDateFormatter(locale, () => ({ year: toValue(yearFormat) ?? 'numeric' }));

  const years = computed<CalendarYearCell[]>(() => {
    const focused = getFocusedDate();
    const current = getSelectedDate();
    const minDate = getMinDate();
    const maxDate = getMaxDate();

    return Array.from({ length: YEAR_CELLS_COUNT }, (_, i) => {
      const startYear = Math.floor(focused.year / YEAR_CELLS_COUNT) * YEAR_CELLS_COUNT;
      const date = focused.set({
        year: startYear + i,
        month: 1,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
        millisecond: 0,
      });

      let disabled = false;

      if (minDate && minDate.year < date.year) {
        disabled = true;
      }

      if (maxDate && maxDate.year > date.year) {
        disabled = true;
      }

      const cell: CalendarYearCell = {
        type: 'year',
        label: yearFormatter.value.format(date.toDate()),
        value: date,
        year: date.year,
        selected: date.year === current.year,
        focused: focused.year === date.year,
        disabled,
      };

      return cell;
    });
  });

  return { years, yearFormatter };
}
