import { act, fireEvent, render, screen } from '@testing-library/react';

import { auth } from '../store/authStore';
import App from './app';

// Remotes are fetched over the network at runtime, so stand them in with a marker.
jest.mock('../components/RemoteLoader', () => ({
  RemoteLoader: ({ remote }: { remote: string }) => <div data-testid={`remote-${remote}`} />,
}));

const NAME = 'Ada';

function login(name: string) {
  fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), {
    target: { value: name },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Login' }));
}

describe('App', () => {
  // The auth store is a module singleton, so a session would leak between tests.
  afterEach(async () => {
    await act(() => auth.logout());
  });

  it('renders the shell title', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Streambox Host' })).toBeTruthy();
  });

  it('mounts both remotes', () => {
    render(<App />);

    expect(screen.getByTestId('remote-movies')).toBeTruthy();
    expect(screen.getByTestId('remote-music')).toBeTruthy();
  });

  it('keeps Login disabled until a non-blank name is entered', () => {
    render(<App />);
    const input = screen.getByRole('textbox', { name: 'Name' });
    const button = screen.getByRole('button', { name: 'Login' }) as HTMLButtonElement;

    fireEvent.change(input, { target: { value: '   ' } });
    expect(button.disabled).toBe(true);

    fireEvent.change(input, { target: { value: NAME } });
    expect(button.disabled).toBe(false);
  });

  it('greets the user after login', async () => {
    render(<App />);

    login(`  ${NAME}  `);

    expect(await screen.findByText(`Hello, ${NAME}!`)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Login' })).toBeNull();
  });

  it('returns to an empty login form after logout', async () => {
    render(<App />);
    login(NAME);

    fireEvent.click(await screen.findByRole('button', { name: 'Logout' }));

    const input = (await screen.findByRole('textbox', { name: 'Name' })) as HTMLInputElement;
    expect(input.value).toBe('');
  });
});
