import React from 'react';
import { render } from '@testing-library/react-native';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Text } from 'react-native';

const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <Text>Normal content</Text>;
};

describe('ErrorBoundary', () => {
  it('should render children when there is no error', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(getByText('Normal content')).toBeTruthy();
  });

  it('should catch errors and display error UI', () => {
    // Suppress console error for this test
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText('Oops! Something went wrong')).toBeTruthy();

    spy.mockRestore();
  });

  it('should display custom fallback if provided', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const customFallback = (error: Error) => <Text>Custom error: {error.message}</Text>;

    const { getByText } = render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText('Custom error: Test error')).toBeTruthy();

    spy.mockRestore();
  });
});
