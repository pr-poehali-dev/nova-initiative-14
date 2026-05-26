import * as React from 'react';
import { createRoot } from 'react-dom/client'
import App from './App'
import AppErrorBoundary from './components/AppErrorBoundary'
import './index.css'

// Корневой Error Boundary: если App упадёт с runtime-ошибкой,
// покажем пользователю экран с кнопкой «Сбросить кэш и перезагрузить»
// вместо пустого фона.
createRoot(document.getElementById("root")!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
