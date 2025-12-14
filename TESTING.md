# Testing Guide

This project uses **Vitest** for unit testing and **React Testing Library** for component testing.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Test Structure

Tests are co-located with the code they test using the `.test.ts` or `.test.tsx` extension.

```
client/src/
├── lib/
│   ├── utils.ts
│   └── utils.test.ts         # Unit tests for utilities
├── hooks/
│   ├── use-auth.ts
│   └── use-auth.test.ts      # Tests for hooks
└── components/
    ├── Button.tsx
    └── Button.test.tsx       # Component tests

api/
└── lib/
    ├── rate-limit.ts
    └── rate-limit.test.ts    # API logic tests
```

## Writing Tests

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from './myFunction';

describe('myFunction', () => {
  it('should return expected result', () => {
    expect(myFunction(input)).toBe(expectedOutput);
  });
});
```

### Component Tests

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Testing Async Code

```typescript
import { describe, it, expect } from 'vitest';

describe('async function', () => {
  it('should handle async operations', async () => {
    const result = await myAsyncFunction();
    expect(result).toBe(expected);
  });
});
```

## Test Coverage

Current test coverage focuses on:

✅ **Utility Functions**:
- `lib/utils.ts` - className merging utility

✅ **Business Logic**:
- `hooks/use-auth.ts` - Level calculation and XP thresholds
- `api/lib/rate-limit.ts` - Rate limiting logic

## Areas for Additional Testing

The following areas would benefit from additional test coverage:

### High Priority
1. **API Endpoints**: Test request/response handling, validation, error cases
2. **Authentication Flow**: Login, logout, token refresh
3. **Workout Logging**: XP calculation, validation, database updates
4. **Challenge Management**: Create, join, progress tracking

### Medium Priority
5. **Social Features**: Follow/unfollow, activity feed
6. **Analytics Calculations**: Streak calculation, statistics aggregation
7. **Achievement Unlocking**: Progress tracking, unlock conditions

### Lower Priority
8. **UI Components**: Button, Card, Dialog interactions
9. **Form Validation**: Input validation, error messages
10. **Routing**: Navigation, protected routes

## Best Practices

1. **Test Behavior, Not Implementation**: Focus on what the code does, not how it does it
2. **Keep Tests Simple**: Each test should test one thing
3. **Use Descriptive Names**: Test names should clearly describe what they test
4. **Avoid Test Interdependence**: Tests should be able to run in any order
5. **Mock External Dependencies**: Use mocks for API calls, database operations, etc.

## CI/CD Integration

Tests should be run in the CI/CD pipeline before deployment:

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: npm test

- name: Check coverage
  run: npm run test:coverage
```

## Future Enhancements

- [ ] Add E2E tests with Playwright or Cypress
- [ ] Increase test coverage to >80%
- [ ] Add visual regression testing
- [ ] Add integration tests for API endpoints
- [ ] Add performance testing
- [ ] Set up automated test reporting

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
