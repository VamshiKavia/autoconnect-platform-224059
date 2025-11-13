import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

test('renders brand name', () => {
  render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
  const brand = screen.getByText(/Ocean Motors/i);
  expect(brand).toBeInTheDocument();
});
