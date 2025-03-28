import { fireEvent, render, screen } from '@testing-library/vue';
import { axe } from 'vitest-axe';
import { useSearchField } from './useSearchField';
import { flush } from '@test-utils/flush';

test('should not have a11y errors with labels or descriptions', async () => {
  await render({
    setup() {
      const label = 'Search';
      const description = 'Search for the thing';
      const { inputProps, descriptionProps, labelProps } = useSearchField({
        label,
        description,
      });

      return {
        inputProps,
        descriptionProps,
        labelProps,
        label,
        description,
      };
    },
    template: `
      <div data-testid="fixture">
        <label v-bind="labelProps">{{ label }}</label>
        <input v-bind="inputProps" />
        <span v-bind="descriptionProps">description</span>
      </div>
    `,
  });

  await flush();
  vi.useRealTimers();
  expect(await axe(screen.getByTestId('fixture'))).toHaveNoViolations();
  vi.useFakeTimers();
});

test('Enter key submit the value using the onSubmit prop', async () => {
  const label = 'Search';
  const onSubmit = vi.fn();

  await render({
    setup() {
      const description = 'Search for the thing';
      const { inputProps, descriptionProps, labelProps } = useSearchField({
        label,
        description,
        onSubmit,
      });

      return {
        inputProps,
        descriptionProps,
        labelProps,
        label,
        description,
      };
    },
    template: `
      <div data-testid="fixture">
        <label v-bind="labelProps">{{ label }}</label>
        <input v-bind="inputProps" />
        <span v-bind="descriptionProps">description</span>
      </div>
    `,
  });

  const value = 'Best keyboard';
  await flush();
  await fireEvent.update(screen.getByLabelText(label), value);
  await fireEvent.keyDown(screen.getByLabelText(label), { code: 'Enter' });
  expect(onSubmit).toHaveBeenCalledOnce();
  expect(onSubmit).toHaveBeenLastCalledWith(value);
});

test('blur sets touched to true', async () => {
  const label = 'Search';

  await render({
    setup() {
      const description = 'Search for the thing';
      const { inputProps, descriptionProps, labelProps, isTouched } = useSearchField({
        label,
        description,
      });

      return {
        inputProps,
        descriptionProps,
        labelProps,
        label,
        description,
        isTouched,
      };
    },
    template: `
      <div data-testid="fixture" :class="{ 'touched': isTouched }">
        <label v-bind="labelProps">{{ label }}</label>
        <input v-bind="inputProps" />
        <span v-bind="descriptionProps">description</span>
      </div>
    `,
  });

  await flush();
  expect(screen.getByTestId('fixture').className).not.includes('touched');
  await fireEvent.blur(screen.getByLabelText(label));
  expect(screen.getByTestId('fixture').className).includes('touched');
});

describe('Escape key', async () => {
  const label = 'Search';
  const value = 'Best keyboard';

  test('clears the value', async () => {
    await render({
      setup() {
        const description = 'Search for the thing';
        const { inputProps, descriptionProps, labelProps } = useSearchField({
          label,
          description,
        });

        return {
          inputProps,
          descriptionProps,
          labelProps,
          label,
          description,
        };
      },
      template: `
      <div data-testid="fixture">
        <label v-bind="labelProps">{{ label }}</label>
        <input v-bind="inputProps" />
        <span v-bind="descriptionProps">description</span>
      </div>
    `,
    });

    await flush();
    await fireEvent.update(screen.getByLabelText(label), value);
    expect(screen.getByLabelText(label)).toHaveDisplayValue(value);
    await fireEvent.keyDown(screen.getByLabelText(label), { code: 'Escape' });
    expect(screen.getByLabelText(label)).toHaveDisplayValue('');
  });

  test('ignored when disabled', async () => {
    await render({
      setup() {
        const description = 'Search for the thing';
        const { inputProps, descriptionProps, labelProps } = useSearchField({
          label,
          description,
          value,
          disabled: true,
        });

        return {
          inputProps,
          descriptionProps,
          labelProps,
          label,
          description,
        };
      },
      template: `
      <div data-testid="fixture">
        <label v-bind="labelProps">{{ label }}</label>
        <input v-bind="inputProps" />
        <span v-bind="descriptionProps">description</span>
      </div>
    `,
    });

    await flush();
    expect(screen.getByLabelText(label)).toHaveDisplayValue(value);
    await fireEvent.keyDown(screen.getByLabelText(label), { code: 'Escape' });
    expect(screen.getByLabelText(label)).toHaveDisplayValue(value);
  });

  test('ignored when readonly', async () => {
    await render({
      setup() {
        const description = 'Search for the thing';
        const { inputProps, descriptionProps, labelProps } = useSearchField({
          label,
          description,
          value,
          readonly: true,
        });

        return {
          inputProps,
          descriptionProps,
          labelProps,
          label,
          description,
        };
      },
      template: `
      <div data-testid="fixture">
        <label v-bind="labelProps">{{ label }}</label>
        <input v-bind="inputProps" />
        <span v-bind="descriptionProps">description</span>
      </div>
    `,
    });

    await flush();
    expect(screen.getByLabelText(label)).toHaveDisplayValue(value);
    await fireEvent.keyDown(screen.getByLabelText(label), { code: 'Escape' });
    expect(screen.getByLabelText(label)).toHaveDisplayValue(value);
  });
});

describe('Clear button', () => {
  const label = 'Search';
  const value = 'Best keyboard';

  test('clears the value', async () => {
    await render({
      setup() {
        const description = 'Search for the thing';
        const { inputProps, descriptionProps, labelProps, clearBtnProps } = useSearchField({
          label,
          description,
        });

        return {
          inputProps,
          descriptionProps,
          labelProps,
          label,
          description,
          clearBtnProps,
        };
      },
      template: `
      <div data-testid="fixture">
        <label v-bind="labelProps">{{ label }}</label>
        <input v-bind="inputProps" />
        <span v-bind="descriptionProps">description</span>
        <button v-bind="clearBtnProps">Clear</button>
      </div>
    `,
    });

    await flush();
    await fireEvent.update(screen.getByLabelText(label), value);
    expect(screen.getByLabelText(label)).toHaveDisplayValue(value);
    await fireEvent.click(screen.getByLabelText('Clear search'));
    expect(screen.getByLabelText(label)).toHaveDisplayValue('');
  });

  test('ignored when disabled', async () => {
    await render({
      setup() {
        const description = 'Search for the thing';
        const { inputProps, descriptionProps, labelProps, clearBtnProps } = useSearchField({
          label,
          description,
          disabled: true,
          value,
        });

        return {
          inputProps,
          descriptionProps,
          labelProps,
          label,
          description,
          clearBtnProps,
        };
      },
      template: `
      <div data-testid="fixture">
        <label v-bind="labelProps">{{ label }}</label>
        <input v-bind="inputProps" />
        <span v-bind="descriptionProps">description</span>
        <button v-bind="clearBtnProps">Clear</button>
      </div>
    `,
    });

    await flush();
    expect(screen.getByLabelText(label)).toHaveDisplayValue(value);
    await fireEvent.click(screen.getByLabelText('Clear search'));
    expect(screen.getByLabelText(label)).toHaveDisplayValue(value);
  });

  test('ignored when readonly', async () => {
    await render({
      setup() {
        const description = 'Search for the thing';
        const { inputProps, descriptionProps, labelProps, clearBtnProps } = useSearchField({
          label,
          description,
          readonly: true,
          value,
        });

        return {
          inputProps,
          descriptionProps,
          labelProps,
          label,
          description,
          clearBtnProps,
        };
      },
      template: `
      <div data-testid="fixture">
        <label v-bind="labelProps">{{ label }}</label>
        <input v-bind="inputProps" />
        <span v-bind="descriptionProps">description</span>
        <button v-bind="clearBtnProps">Clear</button>
      </div>
    `,
    });

    await flush();
    expect(screen.getByLabelText(label)).toHaveDisplayValue(value);
    await fireEvent.click(screen.getByLabelText('Clear search'));
    expect(screen.getByLabelText(label)).toHaveDisplayValue(value);
  });
});

test('change event updates the value', async () => {
  const label = 'Search';

  await render({
    setup() {
      const description = 'Search for the thing';
      const { inputProps, descriptionProps, labelProps } = useSearchField({
        label,
        description,
      });

      return {
        inputProps,
        descriptionProps,
        labelProps,
        label,
        description,
      };
    },
    template: `
      <div data-testid="fixture">
        <label v-bind="labelProps">{{ label }}</label>
        <input v-bind="inputProps" />
        <span v-bind="descriptionProps">description</span>
      </div>
    `,
  });

  const value = 'Best keyboard';
  await flush();
  await fireEvent.change(screen.getByLabelText(label), { target: { value } });
  expect(screen.getByLabelText(label)).toHaveDisplayValue(value);
});

test('picks up native error messages', async () => {
  const label = 'Search';

  await render({
    setup() {
      const description = 'Search for the thing';
      const { inputProps, descriptionProps, labelProps, errorMessageProps, errorMessage } = useSearchField({
        label,
        description,
        required: true,
      });

      return {
        inputProps,
        descriptionProps,
        labelProps,
        label,
        description,
        errorMessageProps,
        errorMessage,
      };
    },
    template: `
      <div data-testid="fixture">
        <label v-bind="labelProps">{{ label }}</label>
        <input v-bind="inputProps" />
        <span v-bind="descriptionProps">description</span>
        <span v-bind="errorMessageProps">{{errorMessage}}</span>

      </div>
    `,
  });

  await fireEvent.invalid(screen.getByLabelText(label));
  await flush();
  expect(screen.getByLabelText(label)).toHaveErrorMessage('Constraints not satisfied');

  vi.useRealTimers();
  expect(await axe(screen.getByTestId('fixture'))).toHaveNoViolations();
  vi.useFakeTimers();
});

test('value prop sets the initial value', async () => {
  const label = 'Field';

  await render({
    setup() {
      const { inputProps, labelProps } = useSearchField({
        label,
        value: 'Initial value',
      });

      return {
        inputProps,
        labelProps,
        label,
      };
    },
    template: `
      <div data-testid="fixture">
        <label v-bind="labelProps">{{ label }}</label>
        <input v-bind="inputProps" />
      </div>
    `,
  });

  await flush();
  expect(screen.getByLabelText(label)).toHaveDisplayValue('Initial value');
});

test('modelValue prop sets the initial value', async () => {
  const label = 'Field';

  await render({
    setup() {
      const { inputProps, labelProps } = useSearchField({
        label,
        modelValue: 'Initial value',
      });

      return {
        inputProps,
        labelProps,
        label,
      };
    },
    template: `
      <div data-testid="fixture">
        <label v-bind="labelProps">{{ label }}</label>
        <input v-bind="inputProps" />
      </div>
    `,
  });

  await flush();
  expect(screen.getByLabelText(label)).toHaveDisplayValue('Initial value');
});
