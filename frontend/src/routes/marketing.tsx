import { createFileRoute } from '@tanstack/react-router';
import Marketing from '../pages/Marketing';

export const Route = createFileRoute('/marketing')({
  component: Marketing,
});
