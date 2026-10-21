import React from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import App from './App.jsx';
import { theme } from './theme.js';
// After Mantine's CSS, so the existing pages keep their look while they are migrated one by one.
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MantineProvider theme={theme} forceColorScheme="dark">
      <Notifications position="top-right" />
      <App />
    </MantineProvider>
  </React.StrictMode>,
);
