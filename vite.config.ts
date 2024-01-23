import { defineConfig } from 'vite';
import vike from 'vike/plugin';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react(), vike({})],
  resolve: {
    alias: {
      '$components/*': './src/components/*',
    },
  },
});
