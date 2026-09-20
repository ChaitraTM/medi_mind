import React from 'react';
import { render } from '@testing-library/react';
import Assistant from '../Assistant';

test('renders without crashing', () => {
  render(<Assistant />);
});
