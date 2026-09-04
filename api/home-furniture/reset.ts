import handler from '../home-furniture.js';
export { config } from '../home-furniture.js';
export default function reset(request: Parameters<typeof handler>[0], response: Parameters<typeof handler>[1]) {
  request.query.path = 'reset';
  return handler(request, response);
}
